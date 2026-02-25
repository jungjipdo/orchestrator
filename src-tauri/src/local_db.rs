// ============================================
// local_db.rs — SQLite 로컬 DB 관리
// ~/.orchestrator/local.db 에 사용자 데이터 저장
// ============================================

use rusqlite::{Connection, Result as SqliteResult, params};
use std::path::PathBuf;
use std::sync::Mutex;

/// 로컬 DB 경로: ~/.orchestrator/local.db
fn db_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = home.join(".orchestrator");
    std::fs::create_dir_all(&dir).ok();
    dir.join("local.db")
}

/// 글로벌 DB 커넥션 (Mutex로 thread-safe)
pub struct LocalDb {
    pub conn: Mutex<Connection>,
}

impl LocalDb {
    /// DB 열기 + 스키마 마이그레이션
    pub fn open() -> SqliteResult<Self> {
        let path = db_path();
        log::info!("📦 로컬 DB 경로: {}", path.display());

        let conn = Connection::open(&path)?;

        // WAL 모드 (성능 향상)
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    /// 스키마 마이그레이션 (idempotent)
    fn migrate(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().map_err(|e| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
            ))
        })?;

        conn.execute_batch("
            -- 버전 관리
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- 프로젝트 (Supabase projects → 로컬)
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                repo_id INTEGER NOT NULL,
                repo_name TEXT NOT NULL,
                repo_full_name TEXT NOT NULL UNIQUE,
                repo_url TEXT NOT NULL,
                description TEXT,
                default_branch TEXT NOT NULL DEFAULT 'main',
                language TEXT,
                is_private INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'active',
                metadata TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- GitHub 연결 정보
            CREATE TABLE IF NOT EXISTS github_connections (
                id TEXT PRIMARY KEY,
                github_username TEXT,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                token_expires_at TEXT,
                connected_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- AI 모델 점수 커스텀
            CREATE TABLE IF NOT EXISTS model_scores (
                id TEXT PRIMARY KEY,
                model_key TEXT NOT NULL UNIQUE,
                coding REAL NOT NULL DEFAULT 50,
                analysis REAL NOT NULL DEFAULT 50,
                documentation REAL NOT NULL DEFAULT 50,
                speed REAL NOT NULL DEFAULT 50,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- 에디터별 지원 모델
            CREATE TABLE IF NOT EXISTS editor_models (
                id TEXT PRIMARY KEY,
                editor_type TEXT NOT NULL UNIQUE,
                supported_models TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- 프로젝트 데드라인
            CREATE TABLE IF NOT EXISTS project_deadlines (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                milestone TEXT NOT NULL,
                deadline_at TEXT NOT NULL,
                risk_score REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            -- 고정 이벤트/일정
            CREATE TABLE IF NOT EXISTS fixed_events (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                start_at TEXT NOT NULL,
                end_at TEXT NOT NULL,
                importance TEXT NOT NULL DEFAULT 'medium',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- Watcher 경로 매핑 (현재 메모리에만 있던 것)
            CREATE TABLE IF NOT EXISTS watcher_paths (
                repo_full_name TEXT PRIMARY KEY,
                local_path TEXT NOT NULL,
                watching INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- 사용자 설정 (동의 상태 등)
            CREATE TABLE IF NOT EXISTS user_preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- 스키마 버전 기록
            INSERT OR IGNORE INTO schema_version (version) VALUES (1);
        ")?;

        log::info!("✅ 로컬 DB 스키마 마이그레이션 완료 (v1)");
        Ok(())
    }
}

// ─── CRUD 헬퍼: watcher_paths ───

impl LocalDb {
    /// watcher 경로 저장/업데이트
    pub fn upsert_watcher_path(&self, repo_full_name: &str, local_path: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().map_err(|e| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
            ))
        })?;
        conn.execute(
            "INSERT INTO watcher_paths (repo_full_name, local_path) VALUES (?1, ?2)
             ON CONFLICT(repo_full_name) DO UPDATE SET local_path = ?2",
            params![repo_full_name, local_path],
        )?;
        Ok(())
    }

    /// watcher 경로 삭제
    pub fn delete_watcher_path(&self, repo_full_name: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().map_err(|e| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
            ))
        })?;
        conn.execute(
            "DELETE FROM watcher_paths WHERE repo_full_name = ?1",
            params![repo_full_name],
        )?;
        Ok(())
    }

    /// 모든 watcher 경로 조회
    pub fn get_all_watcher_paths(&self) -> SqliteResult<Vec<(String, String)>> {
        let conn = self.conn.lock().map_err(|e| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
            ))
        })?;
        let mut stmt = conn.prepare(
            "SELECT repo_full_name, local_path FROM watcher_paths WHERE watching = 1"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        rows.collect()
    }
}

// ─── CRUD 헬퍼: user_preferences ───

impl LocalDb {
    /// 설정값 저장
    pub fn set_preference(&self, key: &str, value: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().map_err(|e| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
            ))
        })?;
        conn.execute(
            "INSERT INTO user_preferences (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')",
            params![key, value],
        )?;
        Ok(())
    }

    /// 설정값 조회
    pub fn get_preference(&self, key: &str) -> SqliteResult<Option<String>> {
        let conn = self.conn.lock().map_err(|e| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
            ))
        })?;
        let result = conn.query_row(
            "SELECT value FROM user_preferences WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        );
        match result {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

// ─── lock 헬퍼 ───

impl LocalDb {
    fn lock_conn(&self) -> Result<std::sync::MutexGuard<'_, Connection>, rusqlite::Error> {
        self.conn.lock().map_err(|e| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(std::io::ErrorKind::Other, e.to_string()),
            ))
        })
    }
}

// ─── CRUD: model_scores ───

impl LocalDb {
    pub fn get_all_model_scores(&self) -> SqliteResult<Vec<serde_json::Value>> {
        let conn = self.lock_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, model_key, coding, analysis, documentation, speed, updated_at FROM model_scores"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "model_key": row.get::<_, String>(1)?,
                "coding": row.get::<_, f64>(2)?,
                "analysis": row.get::<_, f64>(3)?,
                "documentation": row.get::<_, f64>(4)?,
                "speed": row.get::<_, f64>(5)?,
                "updated_at": row.get::<_, String>(6)?,
            }))
        })?;
        rows.collect()
    }

    pub fn upsert_model_score(
        &self, model_key: &str, coding: f64, analysis: f64, documentation: f64, speed: f64,
    ) -> SqliteResult<()> {
        let conn = self.lock_conn()?;
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO model_scores (id, model_key, coding, analysis, documentation, speed)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(model_key) DO UPDATE SET
               coding = ?3, analysis = ?4, documentation = ?5, speed = ?6,
               updated_at = datetime('now')",
            params![id, model_key, coding, analysis, documentation, speed],
        )?;
        Ok(())
    }
}

// ─── CRUD: editor_models ───

impl LocalDb {
    pub fn get_all_editor_models(&self) -> SqliteResult<Vec<serde_json::Value>> {
        let conn = self.lock_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, editor_type, supported_models, updated_at FROM editor_models"
        )?;
        let rows = stmt.query_map([], |row| {
            let models_str = row.get::<_, String>(2)?;
            let models: serde_json::Value = serde_json::from_str(&models_str)
                .unwrap_or(serde_json::json!([]));
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "editor_type": row.get::<_, String>(1)?,
                "supported_models": models,
                "updated_at": row.get::<_, String>(3)?,
            }))
        })?;
        rows.collect()
    }

    pub fn upsert_editor_models(
        &self, editor_type: &str, supported_models: &[String],
    ) -> SqliteResult<()> {
        let conn = self.lock_conn()?;
        let id = uuid::Uuid::new_v4().to_string();
        let models_json = serde_json::to_string(supported_models).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "INSERT INTO editor_models (id, editor_type, supported_models)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(editor_type) DO UPDATE SET
               supported_models = ?3, updated_at = datetime('now')",
            params![id, editor_type, models_json],
        )?;
        Ok(())
    }
}

// ─── CRUD: projects ───

impl LocalDb {
    pub fn get_all_projects(&self) -> SqliteResult<Vec<serde_json::Value>> {
        let conn = self.lock_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, repo_id, repo_name, repo_full_name, repo_url, description,
                    default_branch, language, is_private, status, metadata, created_at, updated_at
             FROM projects ORDER BY created_at DESC"
        )?;
        let rows = stmt.query_map([], |row| {
            let metadata_str = row.get::<_, String>(10)?;
            let metadata: serde_json::Value = serde_json::from_str(&metadata_str)
                .unwrap_or(serde_json::json!({}));
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "repo_id": row.get::<_, i64>(1)?,
                "repo_name": row.get::<_, String>(2)?,
                "repo_full_name": row.get::<_, String>(3)?,
                "repo_url": row.get::<_, String>(4)?,
                "description": row.get::<_, Option<String>>(5)?,
                "default_branch": row.get::<_, String>(6)?,
                "language": row.get::<_, Option<String>>(7)?,
                "is_private": row.get::<_, bool>(8)?,
                "status": row.get::<_, String>(9)?,
                "metadata": metadata,
                "created_at": row.get::<_, String>(11)?,
                "updated_at": row.get::<_, String>(12)?,
            }))
        })?;
        rows.collect()
    }

    pub fn upsert_project(&self, project: &serde_json::Value) -> SqliteResult<()> {
        let conn = self.lock_conn()?;
        let id = project["id"].as_str().unwrap_or(&uuid::Uuid::new_v4().to_string()).to_string();
        let metadata = serde_json::to_string(&project["metadata"]).unwrap_or_else(|_| "{}".to_string());

        conn.execute(
            "INSERT INTO projects (id, repo_id, repo_name, repo_full_name, repo_url, description,
                                   default_branch, language, is_private, status, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(repo_full_name) DO UPDATE SET
               description = ?6, default_branch = ?7, language = ?8,
               is_private = ?9, status = ?10, metadata = ?11,
               updated_at = datetime('now')",
            params![
                id,
                project["repo_id"].as_i64().unwrap_or(0),
                project["repo_name"].as_str().unwrap_or(""),
                project["repo_full_name"].as_str().unwrap_or(""),
                project["repo_url"].as_str().unwrap_or(""),
                project["description"].as_str(),
                project["default_branch"].as_str().unwrap_or("main"),
                project["language"].as_str(),
                project["is_private"].as_bool().unwrap_or(false),
                project["status"].as_str().unwrap_or("active"),
                metadata,
            ],
        )?;
        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> SqliteResult<()> {
        let conn = self.lock_conn()?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_db_open_and_migrate() {
        // 임시 경로에 DB 생성
        let tmp = std::env::temp_dir().join("orchestrator_test.db");
        let _ = std::fs::remove_file(&tmp);

        let conn = Connection::open(&tmp).unwrap();
        conn.execute_batch("PRAGMA journal_mode=WAL;").unwrap();

        let db = LocalDb {
            conn: Mutex::new(conn),
        };
        db.migrate().unwrap();

        // 테이블 존재 확인
        let conn = db.conn.lock().unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='projects'",
            [],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(count, 1);

        let _ = std::fs::remove_file(&tmp);
    }

    #[test]
    fn test_watcher_paths_crud() {
        let tmp = std::env::temp_dir().join("orchestrator_watcher_test.db");
        let _ = std::fs::remove_file(&tmp);

        let conn = Connection::open(&tmp).unwrap();
        let db = LocalDb { conn: Mutex::new(conn) };
        db.migrate().unwrap();

        // insert
        db.upsert_watcher_path("jungjipdo/orchestrator", "/Users/test/orchestrator").unwrap();
        let paths = db.get_all_watcher_paths().unwrap();
        assert_eq!(paths.len(), 1);
        assert_eq!(paths[0].0, "jungjipdo/orchestrator");

        // update
        db.upsert_watcher_path("jungjipdo/orchestrator", "/Users/new/path").unwrap();
        let paths = db.get_all_watcher_paths().unwrap();
        assert_eq!(paths[0].1, "/Users/new/path");

        // delete
        db.delete_watcher_path("jungjipdo/orchestrator").unwrap();
        let paths = db.get_all_watcher_paths().unwrap();
        assert_eq!(paths.len(), 0);

        let _ = std::fs::remove_file(&tmp);
    }

    #[test]
    fn test_preferences_crud() {
        let tmp = std::env::temp_dir().join("orchestrator_prefs_test.db");
        let _ = std::fs::remove_file(&tmp);

        let conn = Connection::open(&tmp).unwrap();
        let db = LocalDb { conn: Mutex::new(conn) };
        db.migrate().unwrap();

        // set
        db.set_preference("data_collection_consent", "true").unwrap();
        let val = db.get_preference("data_collection_consent").unwrap();
        assert_eq!(val, Some("true".to_string()));

        // get nonexistent
        let val = db.get_preference("nonexistent").unwrap();
        assert_eq!(val, None);

        let _ = std::fs::remove_file(&tmp);
    }
}

// ===========================================
// contract.rs — 계약 집행기 (orchx contractEnforcer 재작성)
// allowed_paths 위반 체크
// ===========================================

use crate::session::ExecutionContract;

/// 계약 위반 정보
#[derive(Debug, Clone)]
pub struct Violation {
    pub path: String,
    pub reason: String,
}

/// 계약 집행기
pub struct ContractEnforcer {
    contract: ExecutionContract,
}

impl ContractEnforcer {
    pub fn new(contract: ExecutionContract) -> Self {
        Self { contract }
    }

    /// 계약이 설정되어 있는지 확인
    pub fn has_contract(&self) -> bool {
        !self.contract.allowed_paths.is_empty()
    }

    /// 경로가 허용된 경로인지 체크
    /// 허용 목록이 비어있으면 (계약 미설정) → 항상 통과
    /// 허용 목록이 있으면 → glob 패턴 매칭
    pub fn check_path(&self, relative_path: &str) -> Option<Violation> {
        if !self.has_contract() {
            return None; // 계약 미설정 = 제한 없음
        }

        let is_allowed = self.contract.allowed_paths.iter().any(|pattern| {
            if let Ok(glob_pattern) = glob::Pattern::new(pattern) {
                glob_pattern.matches(relative_path)
            } else {
                // 단순 prefix 매칭 (glob이 아닌 경우)
                relative_path.starts_with(pattern)
            }
        });

        if is_allowed {
            None
        } else {
            Some(Violation {
                path: relative_path.to_string(),
                reason: format!(
                    "경로 '{}' 는 허용된 경로에 포함되지 않음: {:?}",
                    relative_path, self.contract.allowed_paths
                ),
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_contract_allows_all() {
        let enforcer = ContractEnforcer::new(ExecutionContract::default());
        assert!(enforcer.check_path("src/main.rs").is_none());
    }

    #[test]
    fn test_allowed_path_passes() {
        let enforcer = ContractEnforcer::new(ExecutionContract {
            allowed_paths: vec!["src/**".to_string()],
            allowed_commands: vec![],
        });
        assert!(enforcer.check_path("src/lib.rs").is_none());
    }

    #[test]
    fn test_disallowed_path_fails() {
        let enforcer = ContractEnforcer::new(ExecutionContract {
            allowed_paths: vec!["src/**".to_string()],
            allowed_commands: vec![],
        });
        let result = enforcer.check_path("config/secret.toml");
        assert!(result.is_some());
    }
}

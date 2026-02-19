-- =============================================
-- 009: model_scores + editor_models
-- AI 모델 성능평가 + 에디터-모델 매핑
-- =============================================

-- ─── model_scores: 모델별 카테고리 점수 ───
CREATE TABLE IF NOT EXISTS model_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    model_key text NOT NULL,
    coding integer DEFAULT 50 CHECK (coding BETWEEN 0 AND 100),
    analysis integer DEFAULT 50 CHECK (analysis BETWEEN 0 AND 100),
    documentation integer DEFAULT 50 CHECK (documentation BETWEEN 0 AND 100),
    speed integer DEFAULT 50 CHECK (speed BETWEEN 0 AND 100),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, model_key)
);

ALTER TABLE model_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own model_scores"
    ON model_scores FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ─── editor_models: 에디터별 지원 모델 ───
CREATE TABLE IF NOT EXISTS editor_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    editor_type text NOT NULL,
    supported_models text[] NOT NULL DEFAULT '{}',
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, editor_type)
);

ALTER TABLE editor_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own editor_models"
    ON editor_models FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

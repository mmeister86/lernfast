-- Add refined_topic column to lesson table
-- This stores the user-selected refined topic from the suggestion flow

ALTER TABLE lesson ADD COLUMN refined_topic TEXT;

-- Create index for performance optimization
CREATE INDEX idx_lesson_refined_topic ON lesson(refined_topic);

-- Comment for documentation
COMMENT ON COLUMN lesson.refined_topic IS 'User-selected refined topic from AI-generated suggestions';

CREATE TABLE IF NOT EXISTS course_content_imports (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    id UUID NOT NULL,
    manifest JSONB NOT NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (course_id, id)
);
CREATE TABLE IF NOT EXISTS course_import_resources (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    import_id UUID NOT NULL,
    class_id UUID REFERENCES course_classes(id) ON DELETE CASCADE,
    module_index INTEGER NOT NULL,
    lecture_index INTEGER,
    sort_order INTEGER NOT NULL,
    filename TEXT NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    FOREIGN KEY (course_id, import_id) REFERENCES course_content_imports(course_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS course_import_resources_course_idx ON course_import_resources(course_id);

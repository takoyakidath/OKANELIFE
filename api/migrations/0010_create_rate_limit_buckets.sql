CREATE TABLE rate_limit_buckets (
    bucket_key VARCHAR(191) NOT NULL PRIMARY KEY,
    window_start INT NOT NULL,
    count INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

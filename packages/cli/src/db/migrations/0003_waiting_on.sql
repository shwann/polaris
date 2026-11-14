ALTER TABLE tasks ADD COLUMN waiting_on TEXT CHECK(waiting_on IN ('user','customer','dependency'));

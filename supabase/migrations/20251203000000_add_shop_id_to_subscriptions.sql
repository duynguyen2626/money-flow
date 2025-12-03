
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES shops(id);

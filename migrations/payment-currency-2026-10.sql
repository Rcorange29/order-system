ALTER TABLE orders ADD COLUMN payment_currency TEXT NOT NULL DEFAULT 'CNY';
ALTER TABLE orders ADD COLUMN payment_amount REAL;
CREATE TABLE IF NOT EXISTS order_numbers (number INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL UNIQUE);
INSERT INTO order_numbers (order_id) SELECT id FROM orders ORDER BY id;
UPDATE orders SET payment_currency = 'CNY', payment_amount = ROUND(total + COALESCE(delivery_fee, 0), 2)
WHERE payment_amount IS NULL AND payment_method IN ('wechat_transfer', 'alipay_transfer');

-- One-time, guarded shopper-facing classification for the existing 85 products.
-- Product names, prices, images, units, descriptions, and variants are untouched.
UPDATE categories SET name = '水果', sort = 1 WHERE id = 11 AND name = '水果';
UPDATE categories SET name = '叶菜·花菜', sort = 2 WHERE id = 27 AND name = '叶菜类';
UPDATE categories SET name = '瓜果类蔬菜', sort = 3 WHERE id = 29 AND name = '瓜果菜类';
UPDATE categories SET name = '根茎·茎菜', sort = 4 WHERE id = 28 AND name = '根茎类';
UPDATE categories SET name = '葱姜蒜·香草', sort = 5 WHERE id = 13 AND name = '香辛类';
INSERT INTO categories (name, icon, sort)
SELECT '豆类·玉米', '🌽', 6 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '豆类·玉米');
UPDATE categories SET sort = 7 WHERE id = 17 AND name = '菌菇';
UPDATE categories SET sort = 8 WHERE id = 15 AND name = '蛋类';
UPDATE categories SET sort = 9 WHERE id = 14 AND name = '蔬菜盲盒';

-- Culinary vegetables previously mixed into fruit.
UPDATE products SET category_id = 29 WHERE id = 21 AND name = '串茄(小番茄)' AND category_id = 11;
UPDATE products SET category_id = 29 WHERE id = 73 AND name = '炖汤木瓜' AND category_id = 11;

-- Flower vegetables, roots and edible stems previously mixed into leafy greens.
UPDATE products SET category_id = 13 WHERE id = 35 AND name = '韭菜(约300g)' AND category_id = 27;
UPDATE products SET category_id = 28 WHERE id = 66 AND name = '胡萝卜（红萝卜）' AND category_id = 27;
UPDATE products SET category_id = 28 WHERE id = 40 AND name = '莴笋' AND category_id = 27;
UPDATE products SET category_id = 27 WHERE id = 51 AND name = '白福花(白花菜)' AND category_id = 29;
UPDATE products SET category_id = 28 WHERE id = 70 AND name = '芹菜' AND category_id = 29;

-- Fruiting vegetables and peppers previously mixed into cooking aromatics.
UPDATE products SET category_id = 29 WHERE id = 77 AND name = '辣椒' AND category_id = 13;
UPDATE products SET category_id = 29 WHERE id = 82 AND name = '尖青椒' AND category_id = 13;
UPDATE products SET category_id = 29 WHERE id = 81 AND name = '螺丝椒' AND category_id = 13;

-- Beans and corn get their own shelf.
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = '豆类·玉米' ORDER BY id LIMIT 1) WHERE id = 36 AND name = '长豆角' AND category_id = 29;
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = '豆类·玉米' ORDER BY id LIMIT 1) WHERE id = 55 AND name = '四季豆' AND category_id = 29;
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = '豆类·玉米' ORDER BY id LIMIT 1) WHERE id = 61 AND name = '玉米' AND category_id = 28;

-- Merchant-approved seven-category layout. Safe to run again.
-- Only category records and product category_id are changed.
UPDATE categories SET name = '水果', icon = '', sort = 1 WHERE id = 11;
UPDATE categories SET name = '蔬菜', icon = '', sort = 2 WHERE id = 27;
UPDATE categories SET name = '香辛料蔬菜', icon = '', sort = 3 WHERE id = 13;
UPDATE categories SET name = '蔬菜盲盒', icon = '', sort = 4 WHERE id = 14;
UPDATE categories SET name = '蛋类', icon = '', sort = 5 WHERE id = 15;
INSERT INTO categories (name, icon, sort)
SELECT '时令蔬果（限定）', '', 6 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name IN ('时令蔬果（限定）', '时令蔬果(限定)'));
UPDATE categories SET name = '时令蔬果（限定）', icon = '', sort = 6 WHERE name IN ('时令蔬果（限定）', '时令蔬果(限定)');
UPDATE categories SET name = '菌菇', icon = '', sort = 7 WHERE id = 17;

-- Merge the vegetable subdivisions into one shelf.
UPDATE products SET category_id = 27 WHERE category_id IN (
  SELECT id FROM categories WHERE name IN ('根茎类', '根茎·茎菜', '瓜果菜类', '瓜果类蔬菜', '豆类·玉米', '叶菜类', '叶菜·花菜') AND id <> 27
);
UPDATE products SET category_id = 11 WHERE id = 21 AND name = '串茄(小番茄)';
UPDATE products SET category_id = 27 WHERE id = 35 AND name = '韭菜(约300g)';
UPDATE products SET category_id = 13 WHERE (id = 77 AND name = '辣椒') OR (id = 81 AND name = '螺丝椒') OR (id = 82 AND name = '尖青椒');

-- Drop only the now-empty subdivisions; retain every product, including downlisted ones.
DELETE FROM categories WHERE name IN ('根茎类', '根茎·茎菜', '瓜果菜类', '瓜果类蔬菜', '豆类·玉米', '叶菜类', '叶菜·花菜')
  AND NOT EXISTS (SELECT 1 FROM products WHERE products.category_id = categories.id);

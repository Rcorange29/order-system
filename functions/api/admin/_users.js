// Never select password_hash or token in an admin-facing response.
export const userSummarySql = `SELECT u.id, u.username, u.phone, u.wechat_id, u.whatsapp,
  u.account_status, u.is_admin, u.created_at, u.legacy_login_phone,
  CASE WHEN LENGTH(COALESCE(u.password_hash, '')) > 0 THEN 1 ELSE 0 END AS has_password,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(CASE WHEN o.payment_status = 'confirmed' AND o.status <> 'cancelled'
    THEN o.total + COALESCE(o.delivery_fee, 0) ELSE 0 END), 0) AS total_spent,
  MAX(o.created_at) AS last_order_at
  FROM users u LEFT JOIN orders o ON u.id = o.user_id`

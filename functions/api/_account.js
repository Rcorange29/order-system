export function publicAccount(user) {
  return { id: user.id, username: user.username, phone: user.phone || '', wechat_id: user.wechat_id || '', whatsapp: user.whatsapp || '', address_storage_key: user.address_storage_key || user.username, is_admin: user.is_admin ? 1 : 0, admin_role: user.is_admin ? (user.admin_role || 'owner') : null }
}

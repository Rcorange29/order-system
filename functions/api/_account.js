export function publicAccount(user) {
  return { id: user.id, username: user.username, phone: user.phone || '', wechat_id: user.wechat_id || '', whatsapp: user.whatsapp || '', address_storage_key: user.address_storage_key || user.username }
}

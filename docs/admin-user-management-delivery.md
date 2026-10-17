# 本轮交付：后台用户管理与登录方案

## 上线范围

后台增强已部署至 https://admin.jennyfresh.com/ 。顾客登录页面的字段、香港号注册门槛与密码登录方式尚未改版；Plan A/B/C 等待选择。

为了让后台的禁用、重置、改名操作可正常工作，本轮仅对顾客认证加入必要的安全/兼容处理：停用账号不能再登录或使用旧token；保留老香港登录号；注册不能占用已保留的旧登录号；地址继续使用原设备存储键。新增停用提示有简体、繁体、英文三套。没有增加用户名注册表单、内地号码注册或微信登录。

## 已完成的后台功能

- 用户列表：用户名、微信ID、WhatsApp、手机号、注册时间、下单笔数、累计消费、账号状态、密码已设置/未设置。
- 支持按用户名、微信ID、WhatsApp、手机号、用户ID搜索，按账号状态筛选。
- 用户详情：完整订单列表、下单总数和累计消费；每笔订单可跳转原订单详情。
- 管理员可编辑用户名和联系方式，格式错误、重名、联系方式全空时明确报错。
- 微信ID格式为6–20位，字母开头，字母数字下划线或短横线；手机号/WhatsApp接受+852香港手机和+86内地手机，空格、括号、短横线会规范化。格式校验不等于归属验证。
- 可设置新密码，需填写两次且一致；输入框隐藏字符，提交成功/取消/关闭即清空；服务端仅保存随机盐PBKDF2哈希，接口及审计表均不返回原密码或哈希。
- 重置密码、修改登录用户名、停用/启用都会撤销目标账号旧token；修改联系资料不批量退出其他用户。
- 可停用/启用普通账号；停用保留所有订单、付款凭证和优惠券。重新启用后需要登录。
- 管理员账号不能通过此界面停用；jchengat的账号名不可改，is_admin不可通过用户管理接口提交。
- 订单详情可独立修改收货人、联系电话、地址和备注，可清空备注。独立PATCH只允许这四项，不改金额、状态、付款币种、付款截图、商品、订单号或自取点。
- 修改用户资料不会倒灌覆盖历史订单中的收货资料；确实要改某笔订单时，进入对应订单修改。
- 用户名变更保留旧香港登录号及原设备地址缓存键，避免顾客改资料后被锁在账号外或丢失本机地址。

### 统计口径

下单数包含所有订单状态。累计消费以人民币统计：仅纳入已确认收款且未取消、未退款的订单，使用折扣后的订单金额加运费。HKD付款仍按订单中的人民币基准汇总，不按当前汇率重新折算历史金额。

### 为什么不能查看原密码

哈希是一种不可逆的校验结果，不是可解密的密码副本。系统只能验证输入是否正确；管理员忘记原密码时也只能设置新密码。新密码不会出现在用户列表、详情响应、审计内容或数据库的明文字段中。

## 数据库变更

迁移文件：`migrations/2026-10-17-user-management.sql`。

`users`新增：

- `wechat_id TEXT NOT NULL DEFAULT ''`
- `whatsapp TEXT NOT NULL DEFAULT ''`
- `account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','disabled'))`
- `address_storage_key TEXT NOT NULL DEFAULT ''`
- `legacy_login_phone TEXT NOT NULL DEFAULT ''`

新增`admin_user_audit`：id、admin_id、user_id、action、changed_fields、created_at。仅记录操作类型及字段名，不记密码值。新增旧登录号及审计查询索引。

### 执行命令

线上已完成备份、dry-run和迁移，不必再次手工执行原始ALTER语句。后续部署可使用下列幂等脚本，它会检查已有列，跳过已添加的字段：

```sh
# 只读预演：检查现有字段与待执行语句，不写库
node scripts/migrate-user-management.mjs --remote --dry-run

# 确认预演后执行（本次已执行）
node scripts/migrate-user-management.mjs --remote
```

测试库用同一脚本，不加`--remote`，可指定单独的持久化目录：

```sh
node scripts/migrate-user-management.mjs --persist-to=/tmp/order-system-admin-qa-20261017 --dry-run
node scripts/migrate-user-management.mjs --persist-to=/tmp/order-system-admin-qa-20261017
```

迁移前线上备份：`/tmp/order-system-before-admin-users-20261017.sql`。该文件含非公开数据，未提交GitHub。

部署顺序：备份→dry-run→测试副本迁移/测试→线上迁移→构建→Pages部署。若迁移中断，重新运行上述脚本即可继续，不应通过删表重来。

## 验证结果

- 28项自动测试通过，包含7项新增用户管理/安全/订单编辑测试，原香港手机号登录测试保持通过。
- 旧结构测试库dry-run与迁移完成，真实浏览器验证了登录、用户列表、编辑微信/WhatsApp/+86号码、查看全部订单、跳转订单详情、修改地址、清空备注。
- 迁移后逐行对比备份：原9个账号的用户名、手机号、密码哈希、权限及注册时间没有改变；85个商品全部字段没有改变；原2笔订单的收货资料、状态、金额、币种及凭证大小没有改变。jchengat仍为is_admin=1、active。
- 生产测试仅检查公开页面、未授权拦截和只读数据；未重置真实顾客密码、未禁用真实顾客、未改真实订单或制造正式测试订单。
- 生产用户列表与详情接口以原管理员会话只读检查返回200，列字段完整、未暴露哈希/token；未授权请求返回403。商城、微信入口和后台首页均返回200。
- 保留微信经典脚本兼容入口，构建同时生成普通版与微信版。

## 改动文件

### 后台与联系资料

- `functions/api/admin/users.js`：安全的用户汇总列表。
- `functions/api/admin/_users.js`：复用汇总查询，只公开密码是否已设置。
- `functions/api/admin/users/[id].js`：用户详情、资料修改、密码重置、状态变更、审计。
- `functions/api/_contacts.js`：香港/内地联系号码及微信ID校验；不替换顾客登录用的_phone规则。
- `src/admin/UserManage.jsx`：独立用户管理组件，包含表单、订单列表和错误/加载状态。
- `src/admin/App.jsx`：连接新组件、用户订单跳转及订单收货信息编辑。
- `src/admin.css`：沿用现有`.btn`、`.form-row`、`.modal`、`--admin-green`、`--admin-line`，补充表格滚动和详情样式。
- `functions/api/admin/orders/[id].js`：独立编辑收货资料、支持清空备注，保持订单状态规则。

### 后台操作所需的认证兼容

- `functions/api/_utils.js`：拒绝停用账号的token；空密码哈希不能用于验证。
- `functions/api/login.js`：保留原香港登录号、停用拦截、重置竞态保护、返回原地址缓存键。
- `functions/api/register.js`：防止新账号占用仍属于老账号的原登录号；注册格式和字段不变。
- `functions/api/admin/login.js`：停用状态检查、明确模块扩展名。
- `functions/api/me.js`：返回原设备地址存储键。
- `src/client/App.jsx`：沿用原地址缓存键、停用/更新提示三语补齐、联系手机号为空时以用户名显示身份；登录表单不变。

### 迁移、测试与方案

- `migrations/2026-10-17-user-management.sql`、`scripts/migrate-user-management.mjs`。
- `migrations/schema.sql`：新库的同等结构。
- `tests/admin-users.test.mjs`：权限、完整统计、哈希/会话、旧登录兼容、联系方式、订单编辑。
- `tests/phone-login.test.mjs`：测试库结构增加兼容字段，原测试含义不变。
- `docs/customer-login-options.md`：Plan A/B/C的完整对比与字段级schema规划。
- `docs/admin-user-management-delivery.md`：本交付说明。

## 建议验收步骤

1. 进入 https://admin.jennyfresh.com/ ，用原jchengat账号登录，点“用户管理”。检查新增列、总单数及累计消费口径。
2. 搜索一位已有用户，点“管理 / 订单”。核对所有订单能列出，点任一订单能进入完整详情并看到原付款凭证。
3. 用专门的测试顾客账号修改微信/WhatsApp/手机号，分别试+852及+86；输入无效格式或清空全部联系方式应报错。真实联系方式不确定时不要为了试验而改真实账号。
4. 给测试账号改用户名，再用其原香港号和原密码登录，应仍成功，原设备地址仍在。顾客用+86注册仍会被拒绝——这是等待选方案的预期行为。
5. 重置测试顾客密码：界面必须只显示“已设置”，两次新密码不同不能提交。提交后旧密码与旧登录失效，新密码可登录，数据库只有新哈希。
6. 停用测试顾客账号，其旧登录不能继续下单，新登录明确提示已停用。启用后重新登录恢复。管理员账号的停用按钮应禁用；jchengat账号名只读。
7. 在测试订单详情改地址、清空备注并保存，重新打开应保留修改；金额、支付币种、状态、订单号和付款凭证不应变化。
8. 顾客端复核简/繁/EN、HKD/CNY看价及付款、微信入口、截图上传、自取点进度、UST¥500/普通¥1000、自取免运/到家¥30和四个原联系方式。以上业务规则没有在本轮改写。

## 本轮未做

未选择或实施任何一种新顾客登录/注册方案；未增加短信、OAuth、通知渠道或自动找回密码。客服协助重置前仍需人工核实身份。

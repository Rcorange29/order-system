# 顾客登录 / 注册方案（第一阶段，仅供选择）

## 现有机制与问题

已阅读 `functions/api/login.js`、`register.js`、`_phone.js`、客户端 LoginPage 和后台用户管理。

- 顾客目前必须填香港手机号与密码；前端和接口都只接受4–9开头的8位香港手机号码，可带+852。
- 新账号的 `users.username` 自动写成 `+852号码`，手机号同时承担登录身份和联系方式；并未发送短信，也未验证号码归属。
- 老账号曾允许自定义用户名、重复联系方式；目前靠手机号与密码匹配，多个同密码老账号冲突时需人工协助。
- `users.id` 才是订单与优惠券的关联身份，改登录方式无需改订单归属。
- 地址原先按用户名存在顾客设备中。后台改用户名时必须保留原地址存储键；收藏等仍保存在顾客设备，不会自动跨设备同步。
- 无短信验证码的方案只能验证格式，不能证明手机号、微信号属于注册者，也不能严格证明“一个自然人只有一个账号”。活动仍需人工审核截图。

## 三个方案对比

| 项目 | Plan A：独立用户名（推荐） | Plan B：香港 / 内地手机号 | Plan C：微信ID作为登录名 |
|---|---|---|---|
| 登录 | 用户名＋密码；迁移期保留原香港手机号＋密码 | +852或+86手机号＋密码 | 手填微信ID＋密码，不是微信一键授权 |
| 注册必填 | 用户名、密码、确认密码；下列联系方式至少一项 | 手机号、密码、确认密码 | 微信ID、密码、确认密码 |
| 注册选填 | 微信ID、WhatsApp、手机号，各自可空，但不能全部空 | 微信ID、WhatsApp | WhatsApp、手机号 |
| 首选联系方式 | 微信ID优先展示，顾客也可只留WhatsApp或手机号 | 微信ID可优先联系，但手机号仍必须提供 | 微信ID必填并作为首选联系方式 |
| 号码范围 | +852香港8位手机号码、+86内地11位手机号码 | 同左，登录和联系号码明确分开存 | 同左，仅作为联系号码 |
| 忘记密码 | 联系老板→核实既有联系方式及订单线索→后台设置新密码 | 同左；不能仅凭报出手机号就重置 | 同左；不能仅凭填写某个微信号就重置 |
| 成本 | 无短信费，无OAuth接入费 | 无短信费，无OAuth接入费 | 无短信费，无OAuth接入费 |
| 优点 | 登录身份稳定、联系方式可更换；只有微信/WhatsApp的顾客也能注册 | 最接近当前习惯，少记一个用户名，改动较少 | 对微信群顾客直观，少一个用户名字段 |
| 缺点 | 多记一个用户名；需防重名及清晰提示 | 仍排除不愿留手机号的顾客；无验证码仍不能证明号码归属 | 微信ID容易与昵称混淆，可能更换或输错；非微信用户仍被排除；并不验证微信归属 |

### 我的推荐：Plan A

顾客页面写“设置登录账号”，与下面的“怎么联系你”分区。联系方式中先显示微信ID，后面提供WhatsApp和手机号；三项至少一项即可，不强制微信，不排除只用WhatsApp的住户。收款方式与登录身份互不绑定。

新账号设置独立用户名；老账号继续用原香港手机号和原密码，登录后自愿设置更好记的用户名。第一次升级不强迫所有顾客重注册或退出。微信一键OAuth不纳入本轮任何方案。

## 字段级 schema 规划（以下是方案，不在本阶段实施登录改版）

### 已有字段：三种方案均保留

`users.id INTEGER PRIMARY KEY`：永久账号ID，订单和券继续关联它。

`users.username TEXT UNIQUE NOT NULL`：已有账号名称，不批量改名，不自动合并账号。

`users.password_hash TEXT NOT NULL`：只保存带随机盐的PBKDF2哈希，绝不保存原密码。

`users.phone TEXT DEFAULT ''`：联系手机号，可以为空；填写时统一保存+852或+86格式。

`users.token TEXT`、`users.is_admin INTEGER DEFAULT 0`、`users.created_at TEXT`：沿用。`jchengat.is_admin=1` 不变。

### 本轮后台增强共用字段（已经单独实施，不代表已选择登录方案）

| 表 | 字段 | 定义 / 用途 |
|---|---|---|
| users | wechat_id | TEXT NOT NULL DEFAULT ''，联系微信ID，不用于顾客登录 |
| users | whatsapp | TEXT NOT NULL DEFAULT ''，+852/+86联系号码 |
| users | account_status | TEXT NOT NULL DEFAULT 'active'，CHECK active/disabled |
| users | address_storage_key | TEXT NOT NULL DEFAULT ''，冻结原用户名对应的设备地址键，改名不丢本机地址 |
| users | legacy_login_phone | TEXT NOT NULL DEFAULT ''，保留老香港登录号，改联系资料后仍能登录；不设置唯一约束，兼容重复老账号 |
| admin_user_audit | id | INTEGER PRIMARY KEY AUTOINCREMENT |
| admin_user_audit | admin_id / user_id | INTEGER NOT NULL，记录操作人及目标用户ID |
| admin_user_audit | action | TEXT NOT NULL，profile / reset_password / status |
| admin_user_audit | changed_fields | TEXT NOT NULL DEFAULT '[]'，只记字段名称，不记密码或哈希 |
| admin_user_audit | created_at | TEXT NOT NULL，操作时间 |

手机号格式：香港手机8位、+852；内地手机11位、+86。空格、短横线、括号可规范化；不能把香港手机号与内地号后8位当作同一个号码。微信ID按6–20位、字母开头、字母数字下划线或短横线校验，明确与“昵称”区分。WhatsApp号码格式正确不代表已经开通WhatsApp。

### Plan A 的额外结构

- 复用 `users.username` 作为独立登录账号，无需另建顾客账号表；继续采用现有唯一性规则，旧用户名保持原样。
- 新增 `user_login_aliases`：`id INTEGER PRIMARY KEY AUTOINCREMENT`、`user_id INTEGER NOT NULL REFERENCES users(id)`、`kind TEXT NOT NULL CHECK(kind IN ('username','phone','wechat'))`、`identifier TEXT NOT NULL`、`created_at TEXT NOT NULL`。
- 约束 `UNIQUE(user_id, kind, identifier)`，查询索引 `(kind, identifier)`。不强行给老手机号加全局唯一约束；重名/重复号先列清单、人工核对。
- 将 `legacy_login_phone` 作为旧手机号登录别名导入，旧用户可继续手机号登录；后台改名时保存旧用户名别名。新注册只接受未占用的独立用户名，也不能占用任何保留的旧用户名/登录别名。
- 不从联系方式自动制造新的登录别名，避免用户误以为改联系号码等于改登录身份。

### Plan B 的额外结构

- 新增 `users.login_phone TEXT`，与联系用的 `phone` 分开；规范为+852/+86。
- 新增部分唯一索引 `UNIQUE(login_phone) WHERE login_phone IS NOT NULL`。
- 新增与Plan A相同的 `user_login_aliases` 表以保留历史登录号。
- 无冲突的老香港号码填入 `login_phone`；重复号码账号暂不填此字段，继续从旧别名配合原密码区分，并交后台人工处理。不能以迁移为由删除账号或订单。
- 后台修改联系人手机号不自动改 `login_phone`。管理员协助改登录号时，须单独核实身份并撤销旧登录。

### Plan C 的额外结构

- 新账号的`users.username`由系统生成唯一内部名称，不要求顾客另填用户名。
- 新增 `users.login_wechat_id TEXT` 与部分唯一索引 `UNIQUE(login_wechat_id) WHERE login_wechat_id IS NOT NULL`，与联系用 `wechat_id` 分离。
- 新增与Plan A相同的 `user_login_aliases` 表。
- 老账号此字段保持NULL，继续用旧香港号登录；由顾客或管理员核实后设置微信登录ID，不能依据别人填的联系微信号自动合并账号。
- 修改联系微信不自动改登录微信；更换登录微信需确认并保留迁移别名、撤销旧登录。

### 三种方案共同需要的后续配套

若允许没有手机号的顾客下单，第二阶段必须同时修改确认订单页，收集收货人及至少一种联系途径，并保存订单当时的联系资料：

- `orders.contact_wechat_id TEXT NOT NULL DEFAULT ''`
- `orders.contact_whatsapp TEXT NOT NULL DEFAULT ''`
- 保留既有 `orders.phone`、`customer`、`address`，不将新账号资料覆盖到历史订单。
- 老订单新字段默认空，其原姓名、电话、地址、付款截图、编号、金额一律不变。

这些订单联系快照字段在本轮登录方案选择前不添加、不改顾客结账规则。

## 老账号迁移及已登录用户

1. 迁移前备份D1，只读检查字段、用户名/手机号冲突、管理员权限；先dry-run，再在副本迁移并测试，最后线上执行。
2. 保持users.id、原哈希、原订单和优惠券归属，不能新建替代账号或重新计算订单金额。
3. 正常结构迁移保留现有token；已登录顾客可继续使用。后台主动重置密码、改登录用户名、停用/重新启用账号会撤销该账号token，要求重新登录。
4. 老香港手机号与原密码继续可用；重复号用密码区分，仍有冲突时明确联系老板，不随机选择账号。
5. 不自动要求老顾客补填微信ID；有机会再引导完善联系方式。
6. 用户名修改保留address_storage_key，原设备地址继续读取；收藏及其他已有本机数据不删除。换手机本来就不会自动同步这些本机数据，应在后续单独考虑服务端地址簿。
7. 无验证码不能防止所有冒用或多账号；重置密码必须从既有联系渠道人工核实，不能只看申请者新填的信息。优惠券活动继续人工审核。

## 待你确认

回复“选A / 选B / 选C”后，再实施对应顾客注册、登录、三语文案、结账联系快照及完整老账号迁移。当前顾客界面、号码注册门槛尚未改版。

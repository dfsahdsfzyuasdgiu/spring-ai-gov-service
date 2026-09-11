package com.example.myai.controller;

import com.example.myai.common.Result;
import com.example.myai.model.SysUser;
import com.example.myai.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * 国家政务服务平台 · 统一身份认证中心接口
 * （合并管理员与普通群众登录入口，后台自动路由鉴权）
 */
@RestController
@RequestMapping("/api/v1/gov/auth")
@CrossOrigin(origins = "*")
public class GovAuthController {

    private final UserRepository userRepository;

    public GovAuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public static class LoginDTO {
        private String account;        // 用户名、手机号或身份证号
        private String password;       // 密码
        private String loginType;      // "PASSWORD" 或 "SMS"
        private String phone;          // 手机号 (短信登录模式)
        private String code;           // 短信验证码

        public String getAccount() { return account; }
        public void setAccount(String account) { this.account = account; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getLoginType() { return loginType; }
        public void setLoginType(String loginType) { this.loginType = loginType; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
    }

    public static class RegisterDTO {
        private String username;
        private String password;
        private String name;
        private String phone;
        private String idCard;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getIdCard() { return idCard; }
        public void setIdCard(String idCard) { this.idCard = idCard; }
    }

    public static class UserVO {
        private Long id;
        private String username;
        private String name;
        private String phone;
        private String role; // "ADMIN" 或 "CITIZEN"
        private String roleName;
        private String token;

        public UserVO(Long id, String username, String name, String phone, String role, String roleName, String token) {
            this.id = id;
            this.username = username;
            this.name = name;
            this.phone = phone;
            this.role = role;
            this.roleName = roleName;
            this.token = token;
        }

        public Long getId() { return id; }
        public String getUsername() { return username; }
        public String getName() { return name; }
        public String getPhone() { return phone; }
        public String getRole() { return role; }
        public String getRoleName() { return roleName; }
        public String getToken() { return token; }
    }

    /**
     * 合并统一登录入口（无论管理员还是普通市民均在此统一鉴权）
     */
    @PostMapping("/login")
    public Result<UserVO> login(@RequestBody(required = false) LoginDTO dto) {
        if (dto == null) {
            return Result.error(400, "请求体不能为空");
        }
        // 模式 1: 手机短信快捷验证码登录
        if ("SMS".equalsIgnoreCase(dto.getLoginType())) {
            String phone = dto.getPhone();
            if (phone == null || phone.trim().length() != 11) {
                return Result.error(400, "请输入有效的11位手机号码");
            }
            if (dto.getCode() == null || dto.getCode().trim().isEmpty()) {
                return Result.error(400, "请输入短信验证码");
            }
            // 检索或自动实名建档
            Optional<SysUser> opt = userRepository.findByAccount(phone);
            SysUser user;
            if (opt.isPresent()) {
                user = opt.get();
            } else {
                user = new SysUser(null, phone, "123456", "市民" + phone.substring(7), phone, "", "CITIZEN", "个人实名市民");
                user = userRepository.save(user);
            }
            String token = "gov-token-" + user.getRole().toLowerCase() + "-" + System.currentTimeMillis();
            return Result.success(new UserVO(user.getId(), user.getUsername(), user.getName(), user.getPhone(), user.getRole(), user.getRoleName(), token));
        }

        // 模式 2: 统一账号密码登录 (支持用户名 / 手机号 / 身份证号)
        String account = dto.getAccount();
        if (account == null || account.trim().isEmpty()) {
            return Result.error(400, "请输入登录账号（用户名/手机号/身份证号）");
        }
        if (dto.getPassword() == null || dto.getPassword().trim().isEmpty()) {
            return Result.error(400, "请输入登录密码");
        }

        Optional<SysUser> opt = userRepository.findByAccount(account);
        if (opt.isEmpty()) {
            return Result.error(401, "账号不存在或尚未完成实名注册");
        }

        SysUser user = opt.get();
        if (!dto.getPassword().equals(user.getPassword())) {
            return Result.error(401, "账号或密码错误，请核对后重试");
        }

        if (user.getStatus() != null && user.getStatus() == 0) {
            return Result.error(403, "该政务实名账号已被冻结，请联系12345处理");
        }

        String token = "gov-token-" + user.getRole().toLowerCase() + "-" + System.currentTimeMillis();
        return Result.success(new UserVO(user.getId(), user.getUsername(), user.getName(), user.getPhone(), user.getRole(), user.getRoleName(), token));
    }

    /**
     * 普通市民实名注册接口
     */
    @PostMapping("/register")
    public Result<UserVO> register(@RequestBody(required = false) RegisterDTO dto) {
        if (dto == null) {
            return Result.error(400, "请求体不能为空");
        }
        if (dto.getUsername() == null || dto.getUsername().trim().isEmpty()) {
            return Result.error(400, "请设置用户名");
        }
        if (dto.getPassword() == null || dto.getPassword().trim().length() < 6) {
            return Result.error(400, "密码长度不得少于6位");
        }
        if (dto.getPhone() == null || dto.getPhone().trim().length() != 11) {
            return Result.error(400, "请输入有效的11位手机号码");
        }
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            return Result.error(400, "请输入真实姓名");
        }

        if (userRepository.exists(dto.getUsername(), dto.getPhone(), dto.getIdCard())) {
            return Result.error(409, "该用户名或手机号码已在政务服务网注册，请直接登录");
        }

        SysUser newUser = new SysUser();
        newUser.setUsername(dto.getUsername().trim());
        newUser.setPassword(dto.getPassword().trim());
        newUser.setName(dto.getName().trim());
        newUser.setPhone(dto.getPhone().trim());
        newUser.setIdCard(dto.getIdCard() != null ? dto.getIdCard().trim() : "");
        newUser.setRole("CITIZEN");
        newUser.setRoleName("个人实名市民");
        newUser.setStatus(1);

        newUser = userRepository.save(newUser);
        String token = "gov-token-citizen-" + System.currentTimeMillis();
        return Result.success(new UserVO(newUser.getId(), newUser.getUsername(), newUser.getName(), newUser.getPhone(), newUser.getRole(), newUser.getRoleName(), token));
    }
}
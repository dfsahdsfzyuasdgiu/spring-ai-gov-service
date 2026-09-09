package com.example.myai.model;

import java.io.Serializable;

/**
 * 国家政务服务平台实名用户实体
 */
public class SysUser implements Serializable {
    private Long id;
    private String username;       // 用户名
    private String password;       // 密码
    private String name;           // 真实姓名
    private String phone;          // 手机号码
    private String idCard;         // 身份证号码
    private String role;           // "ADMIN" 或 "CITIZEN"
    private String roleName;       // "超级管理员" 或 "个人实名市民"
    private Integer status;        // 1: 正常, 0: 锁定
    private String createTime;     // 注册时间
    private String lastLoginTime;  // 最近登录时间

    public SysUser() {}

    public SysUser(Long id, String username, String password, String name, String phone, String idCard, String role, String roleName) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.name = name;
        this.phone = phone;
        this.idCard = idCard;
        this.role = role;
        this.roleName = roleName;
        this.status = 1;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public String getCreateTime() { return createTime; }
    public void setCreateTime(String createTime) { this.createTime = createTime; }
    public String getLastLoginTime() { return lastLoginTime; }
    public void setLastLoginTime(String lastLoginTime) { this.lastLoginTime = lastLoginTime; }
}
package com.example.myai.repository;

import com.example.myai.model.SysUser;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class UserRepository {

    private final Map<Long, SysUser> store = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(100);

    public UserRepository() {
        initDefaultUsers();
    }

    private void initDefaultUsers() {
        // 1. 系统超级管理员账号
        SysUser admin = new SysUser(1L, "admin", "admin123", "系统超级管理员", "13800000000", "110101198001010011", "ADMIN", "超级管理员");
        admin.setCreateTime("2024-01-01 00:00:00");
        store.put(admin.getId(), admin);

        // 2. 预设市民用户 1
        SysUser citizen1 = new SysUser(2L, "user", "123456", "张伟", "13876543210", "460100199508081234", "CITIZEN", "个人实名市民");
        citizen1.setCreateTime("2024-03-01 10:00:00");
        store.put(citizen1.getId(), citizen1);

        // 3. 预设市民用户 2 (李淑敏)
        SysUser citizen2 = new SysUser(3L, "13900001111", "123456", "李淑敏", "13900001111", "460100199203152345", "CITIZEN", "个人实名市民");
        citizen2.setCreateTime("2024-05-12 14:20:00");
        store.put(citizen2.getId(), citizen2);
    }

    /**
     * 根据账号标识检索（支持 用户名、手机号、身份证号 统一识别）
     */
    public Optional<SysUser> findByAccount(String account) {
        if (account == null || account.trim().isEmpty()) {
            return Optional.empty();
        }
        String acc = account.trim();
        return store.values().stream()
                .filter(u -> acc.equalsIgnoreCase(u.getUsername()) 
                          || acc.equals(u.getPhone()) 
                          || acc.equalsIgnoreCase(u.getIdCard()))
                .findFirst();
    }

    /**
     * 校验账号是否已注册
     */
    public boolean exists(String username, String phone, String idCard) {
        return store.values().stream().anyMatch(u -> 
            (username != null && username.trim().equalsIgnoreCase(u.getUsername())) ||
            (phone != null && phone.trim().equals(u.getPhone())) ||
            (idCard != null && idCard.trim().equalsIgnoreCase(u.getIdCard()))
        );
    }

    /**
     * 保存或注册用户
     */
    public SysUser save(SysUser user) {
        if (user.getId() == null) {
            user.setId(idGen.incrementAndGet());
        }
        if (user.getCreateTime() == null) {
            user.setCreateTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        }
        store.put(user.getId(), user);
        return user;
    }

    public List<SysUser> findAll() {
        return new ArrayList<>(store.values());
    }
}
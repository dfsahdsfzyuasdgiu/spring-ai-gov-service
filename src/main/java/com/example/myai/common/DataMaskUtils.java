package com.example.myai.common;

/**
 * 政务敏感个人信息脱敏工具类（符合等保三级公民隐私保护规范）
 */
public class DataMaskUtils {

    /**
     * 手机号脱敏（保留前3后4，中间4位打码，如 138****5678）
     */
    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        if (phone.length() == 11) {
            return phone.substring(0, 3) + "****" + phone.substring(7);
        }
        return phone.replaceAll("(\\d{3})\\d+(\\d{4})", "$1****$2");
    }

    /**
     * 身份证号脱敏（保留前4后4，中间打码，如 4601************12）
     */
    public static String maskIdCard(String idCard) {
        if (idCard == null || idCard.length() < 10) {
            return idCard;
        }
        if (idCard.length() == 18) {
            return idCard.substring(0, 4) + "**********" + idCard.substring(14);
        }
        return idCard.replaceAll("(\\d{4})\\d+(\\w{4})", "$1**********$2");
    }

    /**
     * 姓名脱敏（张三 -> 张*；诸葛孔明 -> 诸**明）
     */
    public static String maskName(String name) {
        if (name == null || name.isEmpty()) {
            return name;
        }
        if (name.length() == 2) {
            return name.charAt(0) + "*";
        }
        if (name.length() > 2) {
            return name.charAt(0) + "*".repeat(name.length() - 2) + name.charAt(name.length() - 1);
        }
        return name;
    }
}

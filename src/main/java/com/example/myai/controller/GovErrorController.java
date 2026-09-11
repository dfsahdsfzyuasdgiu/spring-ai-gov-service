package com.example.myai.controller;

import com.example.myai.common.Result;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 广州市政务服务平台 · 统一底层错误控制器
 * 兜底处理所有未经 Controller 处理的底层容器与路由错误，返回标准 JSON 结构
 */
@RestController
public class GovErrorController implements ErrorController {

    @RequestMapping(value = "/error")
    public ResponseEntity<Result<String>> handleError(HttpServletRequest request) {
        Integer statusCode = (Integer) request.getAttribute("jakarta.servlet.error.status_code");
        if (statusCode == null) {
            statusCode = 404;
        }
        String message;
        if (statusCode == 404) {
            message = "请求的政务资源或接口不存在（404 Not Found），请检查访问 URL。";
        } else if (statusCode == 400) {
            message = "请求参数或数据格式不合法（400 Bad Request）。";
        } else if (statusCode == 401) {
            message = "未经授权的政务服务访问（401 Unauthorized）。";
        } else if (statusCode == 403) {
            message = "访问被拒绝（403 Forbidden）。";
        } else if (statusCode == 405) {
            message = "不支持的请求方式（405 Method Not Allowed）。";
        } else if (statusCode == 500) {
            message = "政务服务接口内部处理异常（500 Internal Server Error），请稍后重试。";
        } else {
            message = "政务服务系统响应状态: " + statusCode;
        }
        return ResponseEntity.status(statusCode)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Result.error(statusCode, message));
    }
}

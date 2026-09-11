package com.example.myai.controller;

import com.example.myai.common.Result;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GovErrorController implements ErrorController {

    @RequestMapping("/error")
    public ResponseEntity<Result<String>> handleError(HttpServletRequest request) {
        Integer statusCode = (Integer) request.getAttribute("jakarta.servlet.error.status_code");
        if (statusCode == null) {
            statusCode = 404;
        }
        String message;
        if (statusCode == 404) {
            message = "请求的政务资源或接口不存在（404 Not Found），请检查访问 URL。";
        } else if (statusCode == 500) {
            message = "政务服务接口内部处理异常（500 Internal Server Error），请稍后重试。";
        } else {
            message = "政务服务系统响应状态: " + statusCode;
        }
        return ResponseEntity.status(statusCode).body(Result.error(statusCode, message));
    }
}

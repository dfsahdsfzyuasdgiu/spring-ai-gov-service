package com.example.myai.controller;

import com.example.myai.common.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.http.MediaType;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 广州市政务服务系统 · 全局异常处理器
 * 统一拦截所有未捕获异常、参数绑定错误与 404/405/415/500，返回标准结构化 Result&lt;T&gt;，杜绝堆栈泄露与白页
 */
@RestControllerAdvice
public class GovGlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GovGlobalExceptionHandler.class);

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Result<String>> handleNoResourceFound(NoResourceFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Result.error(404, "请求的政务资源或接口不存在（404 Not Found），请检查访问 URL。"));
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Result<String>> handleNoHandlerFound(NoHandlerFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Result.error(404, "请求的政务接口不存在（404 Not Found），请检查访问 URL。"));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Result<String>> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Result.error(405, "不支持的请求方法: " + e.getMethod()));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Result<String>> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException e) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Result.error(415, "不支持的内容类型 (Unsupported Media Type): " + e.getContentType()));
    }

    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<Result<String>> handleMediaTypeNotAcceptable(HttpMediaTypeNotAcceptableException e) {
        return ResponseEntity.status(HttpStatus.NOT_ACCEPTABLE)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Result.error(406, "无法提供客户端可接受的媒体响应格式（406 Not Acceptable）"));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class, IllegalArgumentException.class})
    public ResponseEntity<Result<String>> handleBadRequest(Exception e) {
        log.warn("政务请求参数异常: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Result.error(400, "请求参数错误或数据载荷缺失，请核对输入数据。"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<String>> handleGenericException(Exception e) {
        log.error("政务系统全局未捕获异常", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Result.error(500, "政务服务接口内部处理异常（500 Internal Server Error），请稍后重试。"));
    }
}

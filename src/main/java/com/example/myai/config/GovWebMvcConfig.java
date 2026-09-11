package com.example.myai.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.ArrayList;
import java.util.List;

/**
 * 广州市政务服务系统 · Web MVC 扩展配置
 * 增强 Jackson 消息转换器以支持全场景媒体类型回退（含浏览器原生 text/html 请求），
 * 确保 404/405/500 等异常时统一输出结构化 JSON 载荷，杜绝白页与空包。
 */
@Configuration
public class GovWebMvcConfig implements WebMvcConfigurer {

    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        for (HttpMessageConverter<?> converter : converters) {
            if (converter instanceof MappingJackson2HttpMessageConverter jacksonConverter) {
                List<MediaType> supported = new ArrayList<>(jacksonConverter.getSupportedMediaTypes());
                if (!supported.contains(MediaType.TEXT_HTML)) {
                    supported.add(MediaType.TEXT_HTML);
                }
                if (!supported.contains(MediaType.APPLICATION_OCTET_STREAM)) {
                    supported.add(MediaType.APPLICATION_OCTET_STREAM);
                }
                jacksonConverter.setSupportedMediaTypes(supported);
            }
        }
    }
}

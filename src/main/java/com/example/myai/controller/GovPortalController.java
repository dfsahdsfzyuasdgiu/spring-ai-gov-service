package com.example.myai.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Controller
public class GovPortalController {

    @GetMapping(value = {"/gz_assistant_embed.js", "/inject/gz_assistant_embed.js"}, produces = "application/javascript;charset=UTF-8")
    @ResponseBody
    public String getEmbedScript() {
        try {
            Resource resource = new ClassPathResource("static/inject/gz_assistant_embed.js");
            if (!resource.exists()) {
                resource = new ClassPathResource("static/gz_assistant_embed.js");
            }
            try (InputStream is = resource.getInputStream()) {
                return new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            return "// gz_assistant_embed.js load error: " + e.getMessage();
        }
    }

    @GetMapping(value = "/gz_gov_ai_assistant.user.js", produces = "text/javascript;charset=UTF-8")
    @ResponseBody
    public String getUserScript() {
        try {
            Path path = Paths.get("gz_gov_ai_assistant.user.js");
            if (Files.exists(path)) {
                return Files.readString(path, StandardCharsets.UTF_8);
            }
            Resource resource = new ClassPathResource("static/gz_gov_ai_assistant.user.js");
            try (InputStream is = resource.getInputStream()) {
                return new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            return "// user.js load error: " + e.getMessage();
        }
    }

    @GetMapping("/")
    public String index() {
        return "forward:/index.html";
    }
}
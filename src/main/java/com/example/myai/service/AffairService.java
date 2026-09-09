package com.example.myai.service;

import com.example.myai.model.AffairGuide;
import com.example.myai.repository.AffairRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AffairService {

    private final AffairRepository affairRepository;

    public AffairService(AffairRepository affairRepository) {
        this.affairRepository = affairRepository;
    }

    public List<AffairGuide> listAll() {
        return affairRepository.findAll();
    }

    public List<AffairGuide> listByCategory(String category) {
        return affairRepository.findByCategory(category);
    }

    public Optional<AffairGuide> getById(Long id) {
        return affairRepository.findById(id);
    }

    public AffairGuide matchGuideCard(String userPrompt) {
        return affairRepository.matchBestAffair(userPrompt);
    }
}

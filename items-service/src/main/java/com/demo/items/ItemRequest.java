package com.demo.items;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ItemRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 500) String description,
        @Min(0) int quantity) {
}

<?php

namespace Database\Factories;

use App\Models\File;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class FileFactory extends Factory
{
    protected $model = File::class;

    public function definition(): array
    {
        return [
            'file_id' => Str::random(32),
            'original_name' => $this->faker->word() . '.' . $this->faker->fileExtension(),
            'file_path' => 'files/' . Str::random(2) . '/' . Str::random(2) . '/' . Str::random(32) . '.txt',
            'mime_type' => $this->faker->mimeType(),
            'file_size' => $this->faker->numberBetween(1024, 10485760), // 1KB to 10MB
            'checksum' => hash('sha256', $this->faker->text()),
            'expires_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'expires_at' => $this->faker->dateTimeBetween('-1 week', '-1 hour'),
        ]);
    }

    public function withExpiration(int $days = 7): static
    {
        return $this->state(fn (array $attributes) => [
            'expires_at' => now()->addDays($days),
        ]);
    }

    public function large(): static
    {
        return $this->state(fn (array $attributes) => [
            'file_size' => $this->faker->numberBetween(104857600, 1073741824), // 100MB to 1GB
        ]);
    }

    public function withChecksum(string $checksum): static
    {
        return $this->state(fn (array $attributes) => [
            'checksum' => $checksum,
        ]);
    }
}
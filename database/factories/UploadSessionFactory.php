<?php

namespace Database\Factories;

use App\Models\UploadSession;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UploadSessionFactory extends Factory
{
    protected $model = UploadSession::class;

    public function definition(): array
    {
        return [
            'session_id' => 'upload_' . Str::random(32),
            'original_name' => $this->faker->word() . '.' . $this->faker->fileExtension(),
            'total_size' => $this->faker->numberBetween(10485760, 1073741824), // 10MB to 1GB
            'chunk_size' => 1048576, // 1MB default
            'uploaded_chunks' => [],
            'expires_at' => now()->addHours(24),
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

    public function withChunks(array $chunks): static
    {
        return $this->state(fn (array $attributes) => [
            'uploaded_chunks' => $chunks,
        ]);
    }

    public function complete(): static
    {
        return $this->state(function (array $attributes) {
            $totalChunks = ceil($attributes['total_size'] / $attributes['chunk_size']);
            return [
                'uploaded_chunks' => range(0, $totalChunks - 1),
            ];
        });
    }

    public function partial(float $percentage = 0.5): static
    {
        return $this->state(function (array $attributes) {
            $totalChunks = ceil($attributes['total_size'] / $attributes['chunk_size']);
            $uploadedCount = (int) floor($totalChunks * $percentage);
            return [
                'uploaded_chunks' => range(0, $uploadedCount - 1),
            ];
        });
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UploadSession extends Model
{
    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'session_id',
        'original_name',
        'total_size',
        'chunk_size',
        'uploaded_chunks',
        'expires_at',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'uploaded_chunks' => 'array',
        'expires_at' => 'datetime',
        'total_size' => 'integer',
        'chunk_size' => 'integer',
    ];

    /**
     * Check if the upload session is complete.
     */
    public function isComplete(): bool
    {
        $totalChunks = ceil($this->total_size / $this->chunk_size);
        $uploadedChunks = count($this->uploaded_chunks ?? []);
        
        return $uploadedChunks >= $totalChunks;
    }

    /**
     * Get the next chunk index that needs to be uploaded.
     */
    public function getNextChunkIndex(): int
    {
        $uploadedChunks = $this->uploaded_chunks ?? [];
        $totalChunks = ceil($this->total_size / $this->chunk_size);
        
        for ($i = 0; $i < $totalChunks; $i++) {
            if (!in_array($i, $uploadedChunks)) {
                return $i;
            }
        }
        
        return (int)$totalChunks; // All chunks uploaded
    }

    /**
     * Add a chunk to the uploaded chunks list.
     */
    public function addChunk(int $chunkIndex): void
    {
        $uploadedChunks = $this->uploaded_chunks ?? [];
        
        if (!in_array($chunkIndex, $uploadedChunks)) {
            $uploadedChunks[] = $chunkIndex;
            sort($uploadedChunks);
            $this->uploaded_chunks = $uploadedChunks;
            $this->save();
        }
    }

    /**
     * Get the upload progress as a percentage.
     */
    public function getProgress(): float
    {
        $totalChunks = ceil($this->total_size / $this->chunk_size);
        $uploadedChunks = count($this->uploaded_chunks ?? []);
        
        if ($totalChunks === 0) {
            return 0;
        }
        
        return ($uploadedChunks / $totalChunks) * 100;
    }

    /**
     * Get missing chunk indexes.
     */
    public function getMissingChunks(): array
    {
        $uploadedChunks = $this->uploaded_chunks ?? [];
        $totalChunks = ceil($this->total_size / $this->chunk_size);
        $missingChunks = [];
        
        for ($i = 0; $i < $totalChunks; $i++) {
            if (!in_array($i, $uploadedChunks)) {
                $missingChunks[] = $i;
            }
        }
        
        return $missingChunks;
    }

    /**
     * Find upload session by session_id.
     */
    public static function findBySessionId(string $sessionId): ?self
    {
        return static::where('session_id', $sessionId)->first();
    }

    /**
     * Scope to get expired sessions.
     */
    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<=', now());
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Carbon\Carbon;

class File extends Model
{
    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'file_id',
        'original_name',
        'file_path',
        'mime_type',
        'file_size',
        'checksum',
        'expires_at',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'expires_at' => 'datetime',
        'file_size' => 'integer',
    ];

    /**
     * Check if the file has expired.
     */
    public function isExpired(): bool
    {
        if ($this->expires_at === null) {
            return false;
        }

        return $this->expires_at->isPast();
    }

    /**
     * Get the download URL for the file.
     */
    public function getDownloadUrl(): string
    {
        return route('file.download', ['fileId' => $this->file_id]);
    }

    /**
     * Get the preview URL for the file.
     */
    public function getPreviewUrl(): string
    {
        return route('file.preview', ['fileId' => $this->file_id]);
    }

    /**
     * Get human-readable file size.
     */
    public function getHumanFileSize(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Scope to get non-expired files.
     */
    public function scopeNotExpired($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    /**
     * Scope to get expired files.
     */
    public function scopeExpired($query)
    {
        return $query->whereNotNull('expires_at')
                    ->where('expires_at', '<=', now());
    }

    /**
     * Find file by file_id.
     */
    public static function findByFileId(string $fileId): ?self
    {
        return static::where('file_id', $fileId)->first();
    }
}

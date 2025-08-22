<?php

namespace App\Http\Requests;

use App\Services\FileValidationService;
use Illuminate\Foundation\Http\FormRequest;

class ChunkedUploadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // No authentication required
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $action = $this->input('action', 'upload_chunk');

        switch ($action) {
            case 'initialize':
                return $this->getInitializeRules();
            case 'upload_chunk':
                return $this->getUploadChunkRules();
            case 'resume':
                return $this->getResumeRules();
            default:
                return [];
        }
    }

    /**
     * Get validation rules for initialize action.
     */
    private function getInitializeRules(): array
    {
        $fileValidationService = app(FileValidationService::class);
        $maxSize = $fileValidationService->getMaxFileSize();

        return [
            'original_name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    // Check for dangerous filename patterns
                    if (strpos($value, '..') !== false) {
                        $fail('Filename contains invalid characters.');
                    }
                    if (strpos($value, "\0") !== false) {
                        $fail('Filename contains null bytes.');
                    }
                }
            ],
            'total_size' => [
                'required',
                'integer',
                'min:1',
                "max:{$maxSize}"
            ],
            'chunk_size' => [
                'nullable',
                'integer',
                'min:1048576', // 1MB minimum
                'max:10485760' // 10MB maximum
            ]
        ];
    }

    /**
     * Get validation rules for upload_chunk action.
     */
    private function getUploadChunkRules(): array
    {
        return [
            'session_id' => [
                'required',
                'string',
                'regex:/^upload_[a-zA-Z0-9]{32}$/'
            ],
            'chunk_index' => [
                'required',
                'integer',
                'min:0'
            ],
            'chunk' => [
                'required',
                'file',
                'max:10240' // 10MB max chunk size in KB
            ]
        ];
    }

    /**
     * Get validation rules for resume action.
     */
    private function getResumeRules(): array
    {
        return [
            'session_id' => [
                'required',
                'string',
                'regex:/^upload_[a-zA-Z0-9]{32}$/'
            ]
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'original_name.required' => 'Original filename is required.',
            'original_name.max' => 'Filename is too long (maximum 255 characters).',
            'total_size.required' => 'Total file size is required.',
            'total_size.max' => 'File size exceeds maximum limit of 10GB.',
            'chunk_size.min' => 'Chunk size must be at least 1MB.',
            'chunk_size.max' => 'Chunk size cannot exceed 10MB.',
            'session_id.required' => 'Upload session ID is required.',
            'session_id.regex' => 'Invalid session ID format.',
            'chunk_index.required' => 'Chunk index is required.',
            'chunk_index.min' => 'Chunk index must be non-negative.',
            'chunk.required' => 'Chunk file is required.',
            'chunk.file' => 'Chunk must be a valid file.',
            'chunk.max' => 'Chunk size exceeds maximum limit of 10MB.',
        ];
    }
}
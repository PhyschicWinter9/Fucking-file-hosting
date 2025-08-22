<?php

namespace App\Http\Requests;

use App\Services\FileValidationService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class FileUploadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // No authentication required for file uploads
    }

    /**
     * Get the validation rules that apply to the request.
     * 
     * Requirements: 1.6, 7.7 - File validation and security
     */
    public function rules(): array
    {
        $fileValidationService = app(FileValidationService::class);
        $maxSizeKB = $fileValidationService->getMaxFileSize() / 1024; // Convert to KB for Laravel

        return [
            'file' => [
                'required',
                'file',
                File::default()
                    ->max($maxSizeKB)
                    ->rules([
                        function ($attribute, $value, $fail) use ($fileValidationService) {
                            if (!$value instanceof \Illuminate\Http\UploadedFile) {
                                return;
                            }

                            $validation = $fileValidationService->validateFile($value);
                            if (!$validation['valid']) {
                                $errors = collect($validation['errors'])->pluck('message')->implode(', ');
                                $fail("File validation failed: {$errors}");
                            }
                        }
                    ])
            ],
            'expiration_days' => [
                'nullable',
                'integer',
                'min:1',
                'max:365'
            ]
        ];
    }

    /**
     * Get custom error messages for validation rules.
     */
    public function messages(): array
    {
        return [
            'file.required' => 'A file is required for upload.',
            'file.file' => 'The uploaded item must be a valid file.',
            'file.max' => 'The file size exceeds the maximum limit of 10GB.',
            'expiration_days.integer' => 'Expiration days must be a number.',
            'expiration_days.min' => 'Expiration days must be at least 1 day.',
            'expiration_days.max' => 'Expiration days cannot exceed 365 days.',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Additional cross-field validation can be added here
            if ($this->hasFile('file')) {
                $file = $this->file('file');
                
                // Check if file upload was successful
                if (!$file->isValid()) {
                    $validator->errors()->add('file', 'File upload failed: ' . $file->getErrorMessage());
                }
            }
        });
    }
}
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->string('file_id', 64)->unique();
            $table->string('original_name', 255);
            $table->string('file_path', 500);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->string('checksum', 64);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            // Indexes for performance optimization
            $table->index('file_id');
            $table->index('expires_at');
            $table->index('checksum');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};

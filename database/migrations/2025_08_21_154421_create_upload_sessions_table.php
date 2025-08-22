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
        Schema::create('upload_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('session_id', 64)->unique();
            $table->string('original_name', 255);
            $table->unsignedBigInteger('total_size');
            $table->unsignedInteger('chunk_size');
            $table->json('uploaded_chunks')->default('[]');
            $table->timestamp('expires_at');
            $table->timestamps();

            // Indexes for performance
            $table->index('session_id');
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('upload_sessions');
    }
};

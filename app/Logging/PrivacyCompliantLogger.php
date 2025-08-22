<?php

namespace App\Logging;

use Monolog\Logger;
use Monolog\Processor\ProcessorInterface;

class PrivacyCompliantLogger
{
    /**
     * Customize the given logger instance.
     * 
     * Requirements: 3.1, 3.2, 3.5 - Privacy-focused logging, no IP logging, no user tracking
     */
    public function __invoke(Logger $logger): void
    {
        // Add privacy-compliant processor
        $logger->pushProcessor(new PrivacyProcessor());
        
        // Add handler to strip personal data from all log entries
        $logger->pushProcessor(function ($record) {
            return $this->sanitizeLogRecord($record);
        });
    }

    /**
     * Sanitize log record to remove all personal data.
     */
    private function sanitizeLogRecord(array $record): array
    {
        // Remove personal data from context
        if (isset($record['context'])) {
            $record['context'] = $this->stripPersonalDataFromArray($record['context']);
        }

        // Remove personal data from extra
        if (isset($record['extra'])) {
            $record['extra'] = $this->stripPersonalDataFromArray($record['extra']);
        }

        // Sanitize the message itself
        $record['message'] = $this->sanitizeMessage($record['message']);

        // Add privacy compliance markers
        $record['context']['privacy_compliant'] = true;
        $record['context']['personal_data_stripped'] = true;

        return $record;
    }

    /**
     * Strip personal data from array recursively.
     */
    private function stripPersonalDataFromArray(array $data): array
    {
        $personalDataKeys = [
            'ip', 'ip_address', 'remote_addr', 'client_ip', 'user_ip',
            'x_forwarded_for', 'x_real_ip', 'forwarded_for', 'forwarded',
            'user_agent', 'http_user_agent', 'browser', 'ua',
            'referer', 'referrer', 'http_referer', 'origin',
            'email', 'email_address', 'mail', 'e_mail',
            'phone', 'phone_number', 'telephone', 'mobile',
            'name', 'first_name', 'last_name', 'full_name', 'username',
            'address', 'street', 'city', 'zip', 'postal_code',
            'ssn', 'social_security', 'passport', 'license',
            'credit_card', 'card_number', 'cvv', 'expiry',
            'session_id', 'csrf_token', 'api_key', 'token',
            'password', 'pwd', 'pass', 'secret',
            'cookie', 'cookies', '_cookie',
            'authorization', 'auth', 'bearer',
        ];

        foreach ($personalDataKeys as $key) {
            // Remove exact matches
            if (isset($data[$key])) {
                $data[$key] = '[REDACTED]';
            }

            // Remove partial matches (case insensitive)
            foreach (array_keys($data) as $dataKey) {
                if (is_string($dataKey) && stripos($dataKey, $key) !== false) {
                    $data[$dataKey] = '[REDACTED]';
                }
            }
        }

        // Recursively process nested arrays
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->stripPersonalDataFromArray($value);
            } elseif (is_string($value)) {
                $data[$key] = $this->sanitizeMessage($value);
            }
        }

        return $data;
    }

    /**
     * Sanitize message content to remove personal data patterns.
     */
    private function sanitizeMessage(string $message): string
    {
        // Remove IP addresses (IPv4 and IPv6)
        $message = preg_replace('/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/', '[IP_REDACTED]', $message);
        $message = preg_replace('/\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/', '[IPv6_REDACTED]', $message);

        // Remove email addresses
        $message = preg_replace('/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/', '[EMAIL_REDACTED]', $message);

        // Remove phone numbers (various formats)
        $message = preg_replace('/\b\d{3}-\d{3}-\d{4}\b/', '[PHONE_REDACTED]', $message);
        $message = preg_replace('/\b\(\d{3}\)\s*\d{3}-\d{4}\b/', '[PHONE_REDACTED]', $message);
        $message = preg_replace('/\b\+\d{1,3}\s*\d{3,4}\s*\d{3,4}\s*\d{3,4}\b/', '[PHONE_REDACTED]', $message);

        // Remove credit card numbers
        $message = preg_replace('/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/', '[CARD_REDACTED]', $message);

        // Remove social security numbers
        $message = preg_replace('/\b\d{3}-\d{2}-\d{4}\b/', '[SSN_REDACTED]', $message);

        // Remove URLs that might contain personal data
        $message = preg_replace('/https?:\/\/[^\s]+/', '[URL_REDACTED]', $message);

        // Remove session IDs and tokens
        $message = preg_replace('/[a-fA-F0-9]{32,}/', '[TOKEN_REDACTED]', $message);

        return $message;
    }
}

/**
 * Custom processor for privacy-compliant logging.
 */
class PrivacyProcessor implements ProcessorInterface
{
    /**
     * Process log record to ensure privacy compliance.
     */
    public function __invoke(\Monolog\LogRecord $record): \Monolog\LogRecord
    {
        // Add privacy metadata to extra
        $extra = $record->extra;
        $extra['privacy_mode'] = 'strict';
        $extra['data_protection'] = 'gdpr_compliant';
        $extra['personal_data'] = 'none';
        
        // Remove Laravel's default request context that might contain personal data
        $context = $record->context;
        if (isset($context['request'])) {
            unset($context['request']);
        }

        if (isset($context['user'])) {
            unset($context['user']);
        }

        return $record->with(extra: $extra, context: $context);
    }
}
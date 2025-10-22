<?php

namespace App\Services;

class Helper
{
    /**
     * Format a document URL for display.
     *
     * @param string $documentType
     * @param string $documentUrl
     * @return array
     */
    public static function formatDocument($documentType, $documentUrl)
    {
        return [
            "purposes"    => [$documentType],
            "file"        => "data:image/",
            "description" => $documentType,
            "url"         => $documentUrl,
        ];
    }

    /**
     * Convert an image file to a base64 encoded string.
     *
     * @param string $imagePath
     * @return string|null
     */
    public static function convertImageToBase64($imagePath)
    {
        if (file_exists($imagePath)) {
            $imageData = file_get_contents($imagePath);
            return 'data:image/' . pathinfo($imagePath, PATHINFO_EXTENSION) . ';base64,' . base64_encode($imageData);
        }
        return null;
    }

    public static function sendToBorderless($customer_id) 
    {
        //
    }

    public static function sendToNoah()
    {
        //
    }

    public static function sendToBitnob()
    {
        //
    }
}
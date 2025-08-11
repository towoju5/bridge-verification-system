<?php
namespace App\Http\Controllers;

use App\Services\Helper;

class BridgeKycController extends Controller
{
    public function index()
    {
        // This method can be used to display a list of KYC records or any other relevant data
        return view('bridge_kyc.index');
    }

    private function makeData()
    {
        // This method can be used to prepare data for the view or any other processing
        return [
            'title'       => 'Bridge KYC',
            'description' => 'Manage your KYC records efficiently.',
        ];
    }

    public function documents($documentType, $documentUrl)
    {
        return [
            "purposes"    => [
                $documentType,
            ],
            "file"        => Helper::convertImageToBase64($documentUrl),
            "description" => $documentType,
        ];
    }
}

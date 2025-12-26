<?php

use App\Http\Controllers\BusinessController;
use App\Http\Controllers\CustomerController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');



// Business KYC API
Route::post('business-kyc/submit', [BusinessController::class, 'submitAll']);



Route::post('individual-kyc/submit', [CustomerController::class, 'submitFullKyc']);
Route::post('individual-kyc/submit-all', [CustomerController::class, 'submitIndividualKycAll']);
Route::get('kyc/regenerate/{customerId}/{service}', [CustomerController::class, 'regenerateNoahKycLink']);
// Route::get('kyb/regenerate/{customerId}/{service}', [BusinessController::class, 'regenerateNoahKycLink']);
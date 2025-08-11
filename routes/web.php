<?php

use App\Http\Controllers\BusinessController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\CustomerController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/


Route::get('/', [CustomerController::class, 'showAccountTypeSelection'])->name('home');
Route::get('/account-type', [CustomerController::class, 'showAccountTypeSelection'])->name('account.type');

// Business user Verification Routes
Route::match(['get', 'post'], 'business/verify/individual/start', [BusinessController::class, 'startBusinessVerification'])->name('business.verify.start');
Route::get('business/verify/step/{step}', [BusinessController::class, 'showVerificationStep'])->name('business.verify.step');
Route::post('business/verify/step/{step}', [BusinessController::class, 'saveVerificationStep'])->name('business.verify.step.save');


// Individual user verification routes
Route::match(['get', 'post'], 'customer/verify/individual/start', [CustomerController::class, 'startIndividualVerification'])->name('customer.verify.start');
Route::get('customer/verify/step/{step}', [CustomerController::class, 'showVerificationStep'])->name('customer.verify.step');
Route::post('customer/verify/step/{step}', [CustomerController::class, 'saveVerificationStep'])->name('customer.verify.step.save');

// API Routes for frontend data (Dropdowns etc.)
Route::prefix('api/data')->group(function () {
    Route::get('occupations', [CustomerController::class, 'getOccupations'])->name('api.data.occupations');
    Route::get('account-purposes', [CustomerController::class, 'getAccountPurposes'])->name('api.data.account.purposes');
    Route::get('source-of-funds', [CustomerController::class, 'getSourceOfFunds'])->name('api.data.source.of.funds');
    Route::get('countries', [CustomerController::class, 'getCountries'])->name('api.data.countries');
    Route::get('subdivisions/{countryCode}', [CustomerController::class, 'getSubdivisions'])->name('api.data.subdivisions');
    Route::get('identification-types/{countryCode}', [CustomerController::class, 'getIdentificationTypesByCountry'])->name('api.data.identification.types');
});

// Catch-all route for Inertia
Route::get('/{any}', function () {
    // return Inertia::render('welcome');
    var_dump('Catch-all route hit'); // For debugging
})->where('any', '.*');

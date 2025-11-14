<?php

use App\Http\Controllers\Api\BusinessCustomerController;
use App\Http\Controllers\BusinessController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\CustomerController;
use App\Jobs\ThirdPartyKycSubmission;
use App\Models\CustomerSubmission;
use Illuminate\Support\Facades\Artisan;

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


Route::get('ccu', function(){
    $customer = CustomerSubmission::whereId(12)->first();
    if($customer) {
        $payload = $customer->toArray();
        dispatch(new ThirdPartyKycSubmission($payload));
        return response()->json(['status' => 'Job dispatched', 'customer_id' => $customer->id]);
    }
});


Route::get('/', function(){
    // $user = CustomerSubmission::first();
    // return response()->json($user);
    // if(!request()->has('customer_id')) {
    //     return back()->with('error', 'customer ID is required');
    // }
    // session()->put('customer_submission_id', request()->customer_id);
    return redirect()->to(route('account.type'));
})->name('home');

// Route::get('/account-type', function () {
//     // [CustomerController::class, 'showAccountTypeSelection']
//     abort(404, "Invalid URI or Expired session");
// })->name('account.type');

Route::get('/account-type', [CustomerController::class, 'debugShowAccountTypeSelection'])->name('account.type');

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
    Route::get('get-customer', [CustomerController::class, 'fetchUserData']);
});


Route::prefix('api/business-customer')->group(function () {
    Route::any('step/{stepId}', [BusinessController::class, 'saveBusinessVerificationStep']);
    // Route::any('/step/1', [BusinessCustomerController::class, 'step1'])->name('business.init');
    // Route::any('/step/3', [BusinessCustomerController::class, 'step3']);
    // Route::any('/step/4', [BusinessCustomerController::class, 'step4']);
    // Route::any('/step/5', [BusinessCustomerController::class, 'step5']);
    // Route::any('/step/6', [BusinessCustomerController::class, 'step6']);
    // Route::any('/step/7', [BusinessCustomerController::class, 'step7']);
    // Route::any('/step/8', [BusinessCustomerController::class, 'step8']);
    // Route::any('/submit', [BusinessCustomerController::class, 'submit']);
});


// Route::any('api/business-customer/step/{step}', function () {
//     return response()->json(['message' => 'This is a placeholder for the business customer step API.']);
// })->name('api.business.customer.step');


Route::get('clear', function () {
    Artisan::call('cache:clear');
    Artisan::call('config:clear');
    Artisan::call('config:cache');
    Artisan::call('view:clear');
    Artisan::call('route:clear');
    return response()->json(['status' => 'success', 'message' => 'Cleared!']);
});


// Catch-all route for Inertia
Route::get('/{accountType}/{customerId}', [CustomerController::class, 'showAccountTypeSelection'])->name('customer.verify.start.specific');


Route::get('/{any}', function () {
    // return Inertia::render('welcome');
    var_dump('Catch-all route hit'); // For debugging
})->where('any', '.*');

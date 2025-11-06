<!DOCTYPE html>
<html lang="en" class="h-full bg-gray-50 dark:bg-gray-900">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validation Error</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="h-full flex items-center justify-center px-6">

    <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <div class="flex flex-col items-center space-y-4">
            <div class="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full p-3">
                <!-- Heroicon: X Circle -->
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>

            <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ $message ? 'Oops!' : 'Validation Error' }}</h1>
            <p class="text-gray-500 dark:text-gray-400 text-sm">{{ $message ?? "Please check the following issues:" }}</p>

            <!-- Error List -->
            @if (!empty($errors))
                <ul class="text-left w-full mt-4 space-y-2">
                    @foreach ($errors as $field => $messages)
                        @foreach ((array) $messages as $message)
                            <li class="flex items-start space-x-2 text-sm text-red-600 dark:text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.918-.816 1.995-1.85L21 5.85A2 2 0 0018.85 4H5.15a2 2 0 00-1.995 1.85l-.084 11.3c.077 1.034.941 1.85 1.995 1.85z" />
                                </svg>
                                <span>{{ ucfirst($message) }}</span>
                            </li>
                        @endforeach
                    @endforeach
                </ul>
            @endif

            <!-- Go Back Button -->
            @php
                $returnUrl = request()->input('return_url') ?? url()->previous() ?? 'https://app.yativo.com';
            @endphp

            <div class="mt-8">
                <a href="{{ $returnUrl }}"
                   class="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M15 19l-7-7 7-7" />
                    </svg>
                    Go Back
                </a>
            </div>
        </div>
    </div>

</body>
</html>

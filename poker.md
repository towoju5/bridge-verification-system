# Laravel Poker Pot System — MVC Scaffold

This package of files gives you a working controller, models, migrations, routes, events, config, and a basic UI that talks to your existing `App\Services\PokerGameService` (the one you uploaded). It wires up:

* Pot locking via `hostClicksDealButton()`
* Bet/call/raise/all-in/fold
* Side pots & payout via `payout()` (with host cut from config)
* Real‑time hooks (Broadcast event) you can enable later
* A clean Blade UI (Tailwind + Alpine) with animation hooks

> Drop each snippet into the stated file path. Run migrations, visit the route, and play.

---

## 1) Config — Host Cut & Cache TTL

**File:** `config/poker.php`

```php
<?php

return [
    // 10% default host commission (0.10 = 10%)
    'host_cut' => env('POKER_HOST_CUT', 0.10),

    // Round state TTL in seconds for cache persistence
    'state_ttl' => env('POKER_STATE_TTL', 86400),
];
```

Add to `.env` (optional):

```
POKER_HOST_CUT=0.10
POKER_STATE_TTL=86400
```

---

## 2) Models

### 2.1 `app/Models/PokerPlayer.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PokerPlayer extends Model
{
    use HasFactory;

    protected $fillable = [
        'username',
        'chips',        // integer chips balance for UI/demo; your Wallet Service can override
        'avatar_url',
    ];

    public function tables()
    {
        return $this->belongsToMany(PokerTable::class)
            ->withPivot(['seat_number'])
            ->withTimestamps();
    }
}
```

### 2.2 `app/Models/PokerTable.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PokerTable extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
    ];

    public function players()
    {
        return $this->belongsToMany(PokerPlayer::class)
            ->withPivot(['seat_number'])
            ->withTimestamps();
    }
}
```

---

## 3) Migrations

### 3.1 `database/migrations/2025_08_18_000001_create_poker_players_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('poker_players', function (Blueprint $table) {
            $table->id();
            $table->string('username')->unique();
            $table->unsignedBigInteger('chips')->default(0);
            $table->string('avatar_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poker_players');
    }
};
```

### 3.2 `database/migrations/2025_08_18_000002_create_poker_tables_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('poker_tables', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poker_tables');
    }
};
```

### 3.3 `database/migrations/2025_08_18_000003_create_poker_table_player_pivot.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('poker_player_poker_table', function (Blueprint $table) {
            $table->id();
            $table->foreignId('poker_player_id')->constrained()->cascadeOnDelete();
            $table->foreignId('poker_table_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('seat_number')->nullable();
            $table->timestamps();

            $table->unique(['poker_player_id', 'poker_table_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poker_player_poker_table');
    }
};
```

---

## 4) Controller

**File:** `app/Http/Controllers/PokerGameController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\PokerTable;
use App\Services\PokerGameService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class PokerGameController extends Controller
{
    public function __construct(private PokerGameService $service) {}

    /**
     * State helper — mirrors the service key so the UI can fetch current state.
     */
    protected function stateKey(int $tableId): string
    {
        return "poker:table:{$tableId}:round"; // must match service
    }

    public function state(PokerTable $table)
    {
        $state = Cache::get($this->stateKey($table->id));
        return $state ? response()->json($state) : response()->json(['message' => 'No active round'], 404);
    }

    /** Start a fresh round (initializes pots, resets per-round trackers). */
    public function start(PokerTable $table)
    {
        $state = $this->service->startNewRound($table->id);
        event(new \App\Events\PokerStateUpdated($table->id, $state));
        return response()->json($state);
    }

    /** Lock current pot and open a new one (e.g., host deals next street). */
    public function deal(PokerTable $table)
    {
        $state = $this->service->hostClicksDealButton($table->id);
        event(new \App\Events\PokerStateUpdated($table->id, $state));
        return response()->json($state);
    }

    /** Place or top-up a bet to a target amount (first bet sets minimum). */
    public function bet(Request $request, PokerTable $table)
    {
        $validated = $request->validate([
            'player_id' => ['required', 'integer', 'exists:poker_players,id'],
            'amount'    => ['required', 'integer', 'min:1'],
        ]);
        $state = $this->service->bet($validated['player_id'], (int)$validated['amount'], $table->id);
        event(new \App\Events\PokerStateUpdated($table->id, $state));
        return response()->json($state);
    }

    /** Match the current bet. */
    public function call(Request $request, PokerTable $table)
    {
        $validated = $request->validate([
            'player_id' => ['required', 'integer', 'exists:poker_players,id'],
        ]);
        $state = $this->service->call($validated['player_id'], $table->id);
        event(new \App\Events\PokerStateUpdated($table->id, $state));
        return response()->json($state);
    }

    /** Raise to a new target amount (e.g., from 50 to 70). */
    public function raiseTo(Request $request, PokerTable $table)
    {
        $validated = $request->validate([
            'player_id' => ['required', 'integer', 'exists:poker_players,id'],
            'amount'    => ['required', 'integer', 'min:1'],
        ]);
        $state = $this->service->raiseTo($validated['player_id'], (int)$validated['amount'], $table->id);
        event(new \App\Events\PokerStateUpdated($table->id, $state));
        return response()->json($state);
    }

    /** All-in with remaining chips (amount auto-computed). */
    public function allIn(Request $request, PokerTable $table)
    {
        $validated = $request->validate([
            'player_id' => ['required', 'integer', 'exists:poker_players,id'],
        ]);
        $state = $this->service->allIn($validated['player_id'], $table->id);
        event(new \App\Events\PokerStateUpdated($table->id, $state));
        return response()->json($state);
    }

    /** Player folds. */
    public function fold(Request $request, PokerTable $table)
    {
        $validated = $request->validate([
            'player_id' => ['required', 'integer', 'exists:poker_players,id'],
        ]);
        $state = $this->service->fold($validated['player_id'], $table->id);
        event(new \App\Events\PokerStateUpdated($table->id, $state));
        return response()->json($state);
    }

    /**
     * Host selects winners (in rank order). Payout flows main pot then side pots.
     * Request: { winners: [playerId1, playerId2, ...] }
     */
    public function payout(Request $request, PokerTable $table)
    {
        $validated = $request->validate([
            'winners' => ['required', 'array', 'min:1'],
            'winners.*' => ['integer', 'exists:poker_players,id'],
        ]);
        $state = $this->service->payout($validated['winners'], $table->id);
        event(new \App\Events\PokerStateUpdated($table->id, $state));
        return response()->json($state);
    }
}
```

---

## 5) Routes (API)

**File:** `routes/api.php`

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PokerGameController;

Route::prefix('poker/tables/{table}')->group(function () {
    Route::get('state',   [PokerGameController::class, 'state']);

    Route::post('start',  [PokerGameController::class, 'start']);
    Route::post('deal',   [PokerGameController::class, 'deal']);

    Route::post('bet',    [PokerGameController::class, 'bet']);
    Route::post('call',   [PokerGameController::class, 'call']);
    Route::post('raise',  [PokerGameController::class, 'raiseTo']);
    Route::post('all-in', [PokerGameController::class, 'allIn']);
    Route::post('fold',   [PokerGameController::class, 'fold']);

    Route::post('payout', [PokerGameController::class, 'payout']);
});
```

> Tip: If you want session-based CSRF for Blade POSTs, mirror these in `routes/web.php` too.

---

## 6) Event (optional real‑time)

Enables socket broadcasting (`laravel-websockets`/Reverb/etc.) for state updates.

**File:** `app/Events/PokerStateUpdated.php`

```php
<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PokerStateUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $tableId, public array $state) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('poker.table.' . $this->tableId);
    }

    public function broadcastAs(): string
    {
        return 'PokerStateUpdated';
    }
}
```

Add authorization for the private channel in `routes/channels.php` if you use it:

```php
Broadcast::channel('poker.table.{tableId}', function ($user, $tableId) {
    // return true/false depending on who can listen
    return true; // TODO: tighten to your auth rules
});
```

---

## 7) Seeders (optional for quick demo)

**File:** `database/seeders/PokerDemoSeeder.php`

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PokerPlayer;
use App\Models\PokerTable;

class PokerDemoSeeder extends Seeder
{
    public function run(): void
    {
        $table = PokerTable::firstOrCreate(['name' => 'Main Table']);

        $players = [
            ['username' => 'Alice', 'chips' => 200, 'avatar_url' => null],
            ['username' => 'Bob',   'chips' => 200, 'avatar_url' => null],
            ['username' => 'Cara',  'chips' => 120, 'avatar_url' => null],
            ['username' => 'Dan',   'chips' => 400, 'avatar_url' => null],
        ];

        foreach ($players as $i => $data) {
            $p = PokerPlayer::firstOrCreate(['username' => $data['username']], $data);
            $table->players()->syncWithoutDetaching([$p->id => ['seat_number' => $i + 1]]);
        }
    }
}
```

Run: `php artisan db:seed --class=Database\\Seeders\\PokerDemoSeeder`

---

## 8) Blade UI (Tailwind + Alpine)

**File:** `resources/views/poker/table.blade.php`

```blade
@extends('layouts.app')

@section('content')
<div x-data="pokerUI({ tableId: {{ $table->id }} })" class="max-w-5xl mx-auto p-4">

  <div class="flex items-center justify-between mb-4">
    <h1 class="text-2xl font-bold">Poker — {{ $table->name }}</h1>
    <div class="space-x-2">
      <button @click="startRound" class="px-3 py-2 rounded-2xl bg-indigo-600 text-white shadow">Start Round</button>
      <button @click="dealStreet" class="px-3 py-2 rounded-2xl bg-amber-600 text-white shadow">Deal / Lock Pot</button>
    </div>
  </div>

  <template x-if="state">
    <div class="grid gap-4 md:grid-cols-3">
      <!-- Pots Panel -->
      <div class="md:col-span-2 space-y-3">
        <template x-for="(pot, idx) in state.pots" :key="pot.id">
          <div :class="['p-4 rounded-2xl border', pot.locked ? 'border-gray-400 bg-gray-50' : 'border-green-400 bg-green-50']">
            <div class="flex items-center justify-between">
              <div class="font-semibold" x-text="pot.name + (idx === state.currentPotIndex ? ' (Current)' : '')"></div>
              <div class="text-sm" :class="pot.locked ? 'text-gray-500' : 'text-green-700'" x-text="pot.locked ? 'Locked' : 'Open'"></div>
            </div>
            <div class="mt-2 text-lg">Total: $<span x-text="pot.amount"></span></div>
            <div class="mt-2 flex -space-x-2">
              <template x-for="pid in pot.players" :key="pid">
                <div class="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs" x-text="playerName(pid)"></div>
              </template>
            </div>
          </div>
        </template>
      </div>

      <!-- Players Panel -->
      <div class="space-y-3">
        <template x-for="p in state.players" :key="p.id">
          <div class="p-4 rounded-2xl border bg-white shadow">
            <div class="flex items-center justify-between">
              <div class="font-semibold" x-text="p.name"></div>
              <div class="text-sm">Chips: $<span x-text="p.chips"></span></div>
            </div>
            <div class="mt-2 text-sm flex flex-wrap gap-2">
              <button @click="bet(p.id)" class="px-2 py-1 rounded-xl bg-blue-600 text-white">Bet</button>
              <button @click="call(p.id)" class="px-2 py-1 rounded-xl bg-sky-600 text-white">Call</button>
              <button @click="raiseTo(p.id)" class="px-2 py-1 rounded-xl bg-emerald-600 text-white">Raise</button>
              <button @click="allIn(p.id)" class="px-2 py-1 rounded-xl bg-purple-600 text-white">All‑In</button>
              <button @click="fold(p.id)" class="px-2 py-1 rounded-xl bg-rose-600 text-white">Fold</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </template>

  <!-- Winner selection & payout -->
  <div class="mt-6 p-4 rounded-2xl border bg-white shadow" x-show="state">
    <div class="font-semibold mb-2">Payout Winners (in rank order)</div>
    <div class="flex gap-2 flex-wrap">
      <template x-for="p in state.players" :key="p.id">
        <label class="flex items-center gap-1 text-sm">
          <input type="checkbox" :value="p.id" x-model.number="winners" class="rounded">
          <span x-text="p.name"></span>
        </label>
      </template>
    </div>
    <button @click="payout" class="mt-3 px-3 py-2 rounded-2xl bg-black text-white">Pay Winners</button>
  </div>

  <!-- Minimal toast/notice -->
  <div x-show="toast" x-text="toast" class="fixed bottom-4 right-4 bg-black text-white px-3 py-2 rounded-xl shadow"></div>
</div>

<script>
function pokerUI({ tableId }) {
  return {
    tableId,
    state: null,
    winners: [],
    toast: '',

    async init() { await this.fetchState(); },

    async fetchState() {
      const res = await fetch(`/api/poker/tables/${this.tableId}/state`);
      if (res.ok) this.state = await res.json();
    },

    playerName(id) {
      const p = this.state?.players?.find(x => x.id === id);
      return p ? p.name[0] : '?';
    },

    async startRound() { await this.post('start'); },
    async dealStreet() { await this.post('deal'); },

    async bet(playerId) {
      const amount = parseInt(prompt('Bet amount:'), 10);
      if (!amount) return;
      await this.post('bet', { player_id: playerId, amount });
      this.animateChip(playerId);
    },

    async call(playerId) { await this.post('call', { player_id: playerId }); this.animateChip(playerId); },
    async raiseTo(playerId) {
      const amount = parseInt(prompt('Raise to amount:'), 10);
      if (!amount) return;
      await this.post('raise', { player_id: playerId, amount });
      this.animateChip(playerId);
    },
    async allIn(playerId) { await this.post('all-in', { player_id: playerId }); this.animateChip(playerId); },
    async fold(playerId)  { await this.post('fold', { player_id: playerId }); },

    async payout() {
      await this.post('payout', { winners: this.winners });
      this.animatePayout(this.winners);
      this.winners = [];
    },

    async post(action, body = null) {
      const res = await fetch(`/api/poker/tables/${this.tableId}/${action}` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
        body: body ? JSON.stringify(body) : null,
      });
      const data = await res.json();
      if (res.ok) {
        this.state = data;
        this.toast = `${action} ✓`;
        setTimeout(() => this.toast = '', 1200);
      } else {
        alert(data.message || 'Error');
      }
    },

    // --- Animation hooks ---
    animateChip(playerId) {
      // Stub: tie to your overlay engine; here we just flash the pots panel
      const el = document.querySelector('[x-data]');
      el?.classList.add('ring-4','ring-amber-300');
      setTimeout(() => el?.classList.remove('ring-4','ring-amber-300'), 500);
    },
    animatePayout(winnerIds) {
      const el = document.querySelector('[x-data]');
      el?.classList.add('ring-4','ring-emerald-400');
      setTimeout(() => el?.classList.remove('ring-4','ring-emerald-400'), 800);
    }
  }
}
</script>
@endsection
```

Add a simple route/controller to render the Blade:

**File:** `routes/web.php`

```php
use App\Models\PokerTable;
use Illuminate\Support\Facades\Route;

Route::get('/poker/{table}', function (PokerTable $table) {
    return view('poker.table', compact('table'));
});
```

> Ensure Tailwind & Alpine are included in your layout. If not, add `<script src="https://unpkg.com/alpinejs" defer></script>` and Tailwind via your build or CDN for quick demo.

---

## 9) Service Container Binding (optional)

If you ever need to override defaults at construction, bind in a service provider:

**File:** `app/Providers/AppServiceProvider.php` (register method)

```php
use App\Services\PokerGameService;

$this->app->bind(PokerGameService::class, function () {
    return new PokerGameService(config('poker.host_cut'), config('poker.state_ttl'));
});
```

---

## 10) Policies / Validation Notes

* The `PokerGameService` you uploaded enforces: first bet sets minimum, raises via `raiseTo`, all‑in via `allIn`, side pots computation, pot locking with `hostClicksDealButton`, and payout ordering with host cut. The controller simply forwards validated inputs.
* Server will return validation errors or 422s; UI shows a simple alert. Replace with your preferred toast.
* To prevent actions after pot lock, the service guards that already; controller doesn’t need extra checks.

---

## 11) Quickstart

1. `php artisan migrate`
2. `php artisan db:seed --class=Database\\Seeders\\PokerDemoSeeder`
3. (Optional) Bind service in provider (Section 9).
4. Visit: `/poker/1` (after seeding) to use the UI.

---

## 12) Extensibility Hooks

* **Sockets:** turn on broadcasting (Reverb/Websockets) and the UI can subscribe to `private-poker.table.{id}` and update live on `PokerStateUpdated`.
* **Wallet integration:** replace the `chips` field with your Wallet/Balance Service in the service layer where chips are debited/credited.
* **Overlay:** connect `animateChip` / `animatePayout` to your Stream Overlay Engine.

---

### That’s it

You now have a complete MVC scaffold wired to your existing `PokerGameService` with endpoints, UI, and real‑time hooks. Drop this in, and iterate from here.

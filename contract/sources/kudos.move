module kudos_addr::kudos_board {
    use std::string::String;
    use std::signer;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::account;
    use aptos_framework::timestamp;

    /// Struct to hold a single kudo
    struct Kudo has store, drop, copy {
        sender: address,
        recipient: address,
        message: String,
        timestamp: u64,
    }

    /// Resource to hold all kudos for a user
    struct KudosBoard has key {
        received_kudos: vector<Kudo>,
        sent_count: u64,
        received_count: u64,
    }

    /// Event emitted when a kudo is sent
    #[event]
    struct KudoSentEvent has store, drop {
        sender: address,
        recipient: address,
        message: String,
    }

    /// Initialize kudos board for a user
    public entry fun initialize(account: &signer) {
        let board = KudosBoard {
            received_kudos: vector::empty<Kudo>(),
            sent_count: 0,
            received_count: 0,
        };
        move_to(account, board);
    }

    /// Send a kudo to another user
    public entry fun send_kudo(
        sender: &signer,
        recipient: address,
        message: String,
    ) acquires KudosBoard {
        let sender_addr = signer::address_of(sender);
        let timestamp_val = timestamp::now_seconds();

        // Create the kudo
        let kudo = Kudo {
            sender: sender_addr,
            recipient,
            message,
            timestamp: timestamp_val,
        };

        // Initialize sender's board if not exists
        if (!exists<KudosBoard>(sender_addr)) {
            initialize(sender);
        };

        // Initialize recipient's board if not exists (simplified)
        if (!exists<KudosBoard>(recipient)) {
            // For testnet, we'll skip complex resource account creation
            // In production, you'd want proper initialization
        };

        // Update sender's sent count
        let sender_board = borrow_global_mut<KudosBoard>(sender_addr);
        sender_board.sent_count = sender_board.sent_count + 1;

        // If recipient board exists, add kudo
        if (exists<KudosBoard>(recipient)) {
            let recipient_board = borrow_global_mut<KudosBoard>(recipient);
            vector::push_back(&mut recipient_board.received_kudos, kudo);
            recipient_board.received_count = recipient_board.received_count + 1;
        };

        // Emit event
        event::emit(KudoSentEvent {
            sender: sender_addr,
            recipient,
            message,
        });
    }

    /// Get kudos board for a user (view function)
    #[view]
    public fun get_kudos_board(user: address): (vector<Kudo>, u64, u64) acquires KudosBoard {
        if (!exists<KudosBoard>(user)) {
            return (vector::empty<Kudo>(), 0, 0)
        };

        let board = borrow_global<KudosBoard>(user);
        (board.received_kudos, board.sent_count, board.received_count)
    }

    /// Initialize board for any user (helper function)
    public entry fun init_board_for_user(user: &signer) {
        if (!exists<KudosBoard>(signer::address_of(user))) {
            initialize(user);
        };
    }
}

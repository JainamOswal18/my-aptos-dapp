import { useState, useEffect } from 'react';
import { Account, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import { Heart, Send, Trophy, User } from 'lucide-react';
import './App.css';

// Initialize Aptos client
const config = new AptosConfig({ network: Network.DEVNET });
const aptos = new Aptos(config);

const MODULE_ADDRESS = "0x21f260bc482287686cd584a9a7e28f0b2df146497fa6a9dfa706c8a39cb1df41";

interface Kudo {
  sender: string;
  recipient: string;
  message: string;
  timestamp: string;
}

interface KudosData {
  received_kudos: Kudo[];
  sent_count: string;
  received_count: string;
}

function App() {
  const [account, setAccount] = useState<Account | null>(null);
  const [kudosData, setKudosData] = useState<KudosData | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate new account for demo
  const generateAccount = () => {
    const newAccount = Account.generate();
    setAccount(newAccount);
    localStorage.setItem('aptos_account', newAccount.privateKey.toString());
  };

  // Load account from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('aptos_account');
    if (savedKey) {
  // Convert string to Ed25519PrivateKey
  setAccount(Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(savedKey) }));
    }
  }, []);

  // Load kudos data
  const loadKudosData = async () => {
    if (!account) return;

    try {
        const response = await aptos.view({
          payload: {
            function: `${MODULE_ADDRESS}::kudos_board::get_kudos_board`,
            functionArguments: [account.accountAddress.toString()],
          },
        });

      const [received_kudos, sent_count, received_count] = response;
      setKudosData({
        received_kudos: received_kudos as Kudo[],
        sent_count: sent_count as string,
        received_count: received_count as string,
      });
    } catch (error) {
      console.log('Error loading kudos data:', error);
      setKudosData({
        received_kudos: [],
        sent_count: "0",
        received_count: "0",
      });
    }
  };

  // Send kudo
  const sendKudo = async () => {
    if (!account || !recipientAddress || !message) return;

    setLoading(true);
    try {
        const transaction = await aptos.transaction.build.simple({
          sender: account.accountAddress,
          data: {
            function: `${MODULE_ADDRESS}::kudos_board::send_kudo`,
            functionArguments: [recipientAddress, message],
          },
        });

      const committedTransaction = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      await aptos.waitForTransaction({
        transactionHash: committedTransaction.hash,
      });

      setRecipientAddress('');
      setMessage('');
      await loadKudosData();
      alert('Kudo sent successfully!');
    } catch (error) {
      console.error('Error sending kudo:', error);
      alert('Error sending kudo');
    } finally {
      setLoading(false);
    }
  };

  // Fund account with testnet tokens
  const fundAccount = async () => {
    if (!account) return;

    try {
      await aptos.fundAccount({
        accountAddress: account.accountAddress,
        amount: 100000000, // 1 APT
      });
      alert('Account funded with 1 APT!');
    } catch (error) {
      console.error('Error funding account:', error);
      alert('Error funding account');
    }
  };

  useEffect(() => {
    if (account) {
      loadKudosData();
    }
  }, [account]);

  return (
    <div className="app">
      <header className="header">
        <h1><Heart className="inline" /> Aptos Kudos Board</h1>
        <p>Send appreciation tokens on-chain!</p>
      </header>

      {!account ? (
        <div className="card">
          <h2>Get Started</h2>
          <button onClick={generateAccount} className="btn-primary">
            Create Wallet
          </button>
        </div>
      ) : (
        <div className="container">
          <div className="card">
            <h2><User className="inline" /> Your Account</h2>
            <p className="address">
              {account.accountAddress.toString()}
            </p>
            <button onClick={fundAccount} className="btn-secondary">
              Fund Account (Testnet)
            </button>
          </div>

          <div className="card">
            <h2><Send className="inline" /> Send Kudo</h2>
            <div className="form">
              <input
                type="text"
                placeholder="Recipient Address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="input"
              />
              <input
                type="text"
                placeholder="Your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="input"
              />
              <button
                onClick={sendKudo}
                disabled={loading || !recipientAddress || !message}
                className="btn-primary"
              >
                {loading ? 'Sending...' : 'Send Kudo'}
              </button>
            </div>
          </div>

          {kudosData && (
            <div className="card">
              <h2><Trophy className="inline" /> Your Stats</h2>
              <div className="stats">
                <div className="stat">
                  <span>Kudos Sent:</span>
                  <span>{kudosData.sent_count}</span>
                </div>
                <div className="stat">
                  <span>Kudos Received:</span>
                  <span>{kudosData.received_count}</span>
                </div>
              </div>

              <h3>Received Kudos</h3>
              {kudosData.received_kudos.length === 0 ? (
                <p>No kudos received yet!</p>
              ) : (
                <div className="kudos-list">
                  {kudosData.received_kudos.map((kudo, index) => (
                    <div key={index} className="kudo-item">
                      <p className="kudo-message">"{kudo.message}"</p>
                      <p className="kudo-sender">
                        From: {kudo.sender.slice(0, 10)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

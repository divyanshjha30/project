import { Card, PokerGameState, BlackjackGameState, PokerPlayer, BlackjackPlayer } from '../types';
import { createDeck, shuffleDeck, dealCards, calculatePokerHandRank, calculateBlackjackValue } from './cardUtils';

export class PokerEngine {
  private deck: Card[] = [];
  private gameState: PokerGameState;

  constructor(playerCount: number, smallBlind: number = 5) {
    this.deck = shuffleDeck(createDeck());
    this.gameState = {
      type: 'poker',
      phase: 'preflop',
      deck: this.deck,
      community_cards: [],
      pot: 0,
      current_bet: smallBlind * 2,
      dealer_position: 0,
      current_player: 0,
      small_blind: smallBlind,
      big_blind: smallBlind * 2,
      players: Array.from({ length: playerCount }, (_, i) => ({
        user_id: `player_${i}`,
        seat_index: i,
        cards: [],
        chip_count: 1000,
        current_bet: 0,
        has_acted: false,
        has_folded: false,
        is_all_in: false,
      }))
    };
  }

  public initializeGame(): PokerGameState {
    this.postBlinds();
    this.dealHoleCards();
    return { ...this.gameState };
  }

  private postBlinds(): void {
    const smallBlindPos = (this.gameState.dealer_position + 1) % this.gameState.players.length;
    const bigBlindPos = (this.gameState.dealer_position + 2) % this.gameState.players.length;

    this.gameState.players[smallBlindPos].current_bet = this.gameState.small_blind;
    this.gameState.players[smallBlindPos].chip_count -= this.gameState.small_blind;
    
    this.gameState.players[bigBlindPos].current_bet = this.gameState.big_blind;
    this.gameState.players[bigBlindPos].chip_count -= this.gameState.big_blind;

    this.gameState.pot = this.gameState.small_blind + this.gameState.big_blind;
    this.gameState.current_player = (this.gameState.dealer_position + 3) % this.gameState.players.length;
  }

  private dealHoleCards(): void {
    for (let i = 0; i < 2; i++) {
      for (const player of this.gameState.players) {
        const { cards, remaining } = dealCards(this.gameState.deck, 1);
        player.cards.push(cards[0]);
        this.gameState.deck = remaining;
      }
    }
  }

  public makeMove(playerId: string, action: 'fold' | 'call' | 'raise', amount?: number): PokerGameState {
    const player = this.gameState.players.find(p => p.user_id === playerId);
    if (!player) throw new Error('Player not found');

    switch (action) {
      case 'fold':
        player.has_folded = true;
        break;
      case 'call':
        const callAmount = this.gameState.current_bet - player.current_bet;
        const actualCall = Math.min(callAmount, player.chip_count);
        player.current_bet += actualCall;
        player.chip_count -= actualCall;
        this.gameState.pot += actualCall;
        break;
      case 'raise':
        if (amount && amount > this.gameState.current_bet) {
          const raiseAmount = amount - player.current_bet;
          const actualRaise = Math.min(raiseAmount, player.chip_count);
          player.current_bet += actualRaise;
          player.chip_count -= actualRaise;
          this.gameState.pot += actualRaise;
          this.gameState.current_bet = Math.max(this.gameState.current_bet, player.current_bet);
        }
        break;
    }

    player.has_acted = true;
    this.advanceTurn();
    
    return { ...this.gameState };
  }

  private advanceTurn(): void {
    const activePlayers = this.gameState.players.filter(p => !p.has_folded);
    if (activePlayers.length <= 1) {
      this.endGame();
      return;
    }

    // Check if betting round is complete
    const allActed = activePlayers.every(p => p.has_acted);
    const allBetsEqual = activePlayers.every(p => p.current_bet === this.gameState.current_bet || p.chip_count === 0);

    if (allActed && allBetsEqual) {
      this.advancePhase();
    } else {
      // Move to next active player
      do {
        this.gameState.current_player = (this.gameState.current_player + 1) % this.gameState.players.length;
      } while (this.gameState.players[this.gameState.current_player].has_folded);
    }
  }

  private advancePhase(): void {
    // Reset player actions for next betting round
    this.gameState.players.forEach(p => {
      p.has_acted = false;
      p.current_bet = 0;
    });
    this.gameState.current_bet = 0;

    switch (this.gameState.phase) {
      case 'preflop':
        this.dealFlop();
        this.gameState.phase = 'flop';
        break;
      case 'flop':
        this.dealTurn();
        this.gameState.phase = 'turn';
        break;
      case 'turn':
        this.dealRiver();
        this.gameState.phase = 'river';
        break;
      case 'river':
        this.gameState.phase = 'showdown';
        this.determineWinner();
        break;
    }
  }

  private dealFlop(): void {
    const { cards, remaining } = dealCards(this.gameState.deck, 3);
    this.gameState.community_cards = cards;
    this.gameState.deck = remaining;
  }

  private dealTurn(): void {
    const { cards, remaining } = dealCards(this.gameState.deck, 1);
    this.gameState.community_cards.push(cards[0]);
    this.gameState.deck = remaining;
  }

  private dealRiver(): void {
    const { cards, remaining } = dealCards(this.gameState.deck, 1);
    this.gameState.community_cards.push(cards[0]);
    this.gameState.deck = remaining;
  }

  private determineWinner(): void {
    const activePlayers = this.gameState.players.filter(p => !p.has_folded);
    
    if (activePlayers.length === 1) {
      // Only one player left
      activePlayers[0].chip_count += this.gameState.pot;
    } else {
      // Evaluate hands
      const playerHands = activePlayers.map(player => ({
        player,
        hand: calculatePokerHandRank([...player.cards, ...this.gameState.community_cards])
      }));

      // Find winner(s)
      const bestRank = Math.max(...playerHands.map(ph => ph.hand.rank));
      const winners = playerHands.filter(ph => ph.hand.rank === bestRank);
      
      const potShare = Math.floor(this.gameState.pot / winners.length);
      winners.forEach(winner => {
        winner.player.chip_count += potShare;
      });
    }

    this.gameState.phase = 'finished';
  }

  private endGame(): void {
    this.gameState.phase = 'finished';
  }

  public getGameState(): PokerGameState {
    return { ...this.gameState };
  }
}

export class BlackjackEngine {
  private deck: Card[] = [];
  private gameState: BlackjackGameState;

  constructor(playerCount: number, minBet: number = 10) {
    this.deck = shuffleDeck(createDeck());
    this.gameState = {
      type: 'blackjack',
      phase: 'betting',
      deck: this.deck,
      dealer_cards: [],
      dealer_visible_cards: [],
      players: Array.from({ length: playerCount }, (_, i) => ({
        user_id: `player_${i}`,
        hands: [{
          cards: [],
          bet: 0,
          status: 'playing',
          value: 0,
          soft_ace: false,
        }],
        current_hand: 0,
        total_bet: 0,
        has_acted: false,
      })),
      current_player: 0,
      min_bet: minBet,
    };
  }

  public initializeGame(): BlackjackGameState {
    this.gameState.phase = 'dealing';
    this.dealInitialCards();
    this.gameState.phase = 'playing';
    return { ...this.gameState };
  }

  private dealInitialCards(): void {
    // Deal two cards to each player
    for (let i = 0; i < 2; i++) {
      for (const player of this.gameState.players) {
        const { cards, remaining } = dealCards(this.gameState.deck, 1);
        player.hands[0].cards.push(cards[0]);
        this.gameState.deck = remaining;
        
        // Update hand value
        const handValue = calculateBlackjackValue(player.hands[0].cards);
        player.hands[0].value = handValue.value;
        player.hands[0].soft_ace = handValue.soft;
      }
    }

    // Deal dealer cards (one face up, one face down)
    const { cards: dealerCards, remaining: finalDeck } = dealCards(this.gameState.deck, 2);
    this.gameState.dealer_cards = dealerCards;
    this.gameState.dealer_visible_cards = [dealerCards[0]]; // Only first card visible
    this.gameState.deck = finalDeck;
  }

  public makeMove(playerId: string, action: 'hit' | 'stand' | 'double' | 'split'): BlackjackGameState {
    const player = this.gameState.players.find(p => p.user_id === playerId);
    if (!player) throw new Error('Player not found');

    const currentHand = player.hands[player.current_hand];

    switch (action) {
      case 'hit':
        this.hitPlayer(player, player.current_hand);
        break;
      case 'stand':
        currentHand.status = 'stand';
        break;
      case 'double':
        // Double the bet and hit once
        currentHand.bet *= 2;
        player.total_bet += currentHand.bet;
        this.hitPlayer(player, player.current_hand);
        currentHand.status = 'stand';
        break;
      case 'split':
        if (currentHand.cards.length === 2 && 
            currentHand.cards[0].rank === currentHand.cards[1].rank) {
          this.splitHand(player);
        }
        break;
    }

    this.checkGameProgress();
    return { ...this.gameState };
  }

  private hitPlayer(player: BlackjackPlayer, handIndex: number): void {
    const { cards, remaining } = dealCards(this.gameState.deck, 1);
    player.hands[handIndex].cards.push(cards[0]);
    this.gameState.deck = remaining;

    // Update hand value
    const handValue = calculateBlackjackValue(player.hands[handIndex].cards);
    player.hands[handIndex].value = handValue.value;
    player.hands[handIndex].soft_ace = handValue.soft;

    // Check for bust
    if (handValue.value > 21) {
      player.hands[handIndex].status = 'bust';
    }
  }

  private splitHand(player: BlackjackPlayer): void {
    const originalHand = player.hands[player.current_hand];
    const secondCard = originalHand.cards.pop()!;
    
    // Create new hand
    const newHand = {
      cards: [secondCard],
      bet: originalHand.bet,
      status: 'playing' as const,
      value: 0,
      soft_ace: false,
    };

    player.hands.push(newHand);
    player.total_bet += newHand.bet;

    // Deal new cards to both hands
    this.hitPlayer(player, player.current_hand);
    this.hitPlayer(player, player.hands.length - 1);
  }

  private checkGameProgress(): void {
    const allPlayersDone = this.gameState.players.every(player => 
      player.hands.every(hand => hand.status !== 'playing')
    );

    if (allPlayersDone) {
      this.gameState.phase = 'dealer_turn';
      this.playDealer();
    } else {
      this.advancePlayer();
    }
  }

  private advancePlayer(): void {
    const currentPlayer = this.gameState.players[this.gameState.current_player];
    
    // Move to next hand or next player
    if (currentPlayer.current_hand < currentPlayer.hands.length - 1) {
      currentPlayer.current_hand++;
    } else {
      // Find next player with active hands
      do {
        this.gameState.current_player = (this.gameState.current_player + 1) % this.gameState.players.length;
      } while (this.gameState.players[this.gameState.current_player].hands.every(h => h.status !== 'playing'));
    }
  }

  private playDealer(): void {
    // Reveal dealer's hole card
    this.gameState.dealer_visible_cards = [...this.gameState.dealer_cards];

    // Dealer hits on soft 17
    let dealerValue = calculateBlackjackValue(this.gameState.dealer_cards);
    
    while (dealerValue.value < 17 || (dealerValue.value === 17 && dealerValue.soft)) {
      const { cards, remaining } = dealCards(this.gameState.deck, 1);
      this.gameState.dealer_cards.push(cards[0]);
      this.gameState.dealer_visible_cards.push(cards[0]);
      this.gameState.deck = remaining;
      dealerValue = calculateBlackjackValue(this.gameState.dealer_cards);
    }

    this.gameState.phase = 'finished';
    this.determineWinners(dealerValue.value);
  }

  private determineWinners(dealerValue: number): void {
    this.gameState.players.forEach(player => {
      player.hands.forEach(hand => {
        if (hand.status === 'bust') {
          // Player busted, loses bet
          return;
        }

        const isBlackjack = hand.cards.length === 2 && hand.value === 21;
        const dealerBust = dealerValue > 21;
        const dealerBlackjack = this.gameState.dealer_cards.length === 2 && dealerValue === 21;

        if (isBlackjack && !dealerBlackjack) {
          // Blackjack pays 3:2
          hand.status = 'blackjack';
          // In real implementation, add chips to player account
        } else if (dealerBust || hand.value > dealerValue) {
          // Player wins
          hand.status = 'finished';
          // In real implementation, pay 1:1
        } else if (hand.value === dealerValue) {
          // Push (tie)
          hand.status = 'finished';
          // In real implementation, return original bet
        } else {
          // Dealer wins
          hand.status = 'finished';
          // Bet is already lost
        }
      });
    });
  }

  public getGameState(): BlackjackGameState {
    return { ...this.gameState };
  }
}

export const validateMove = (
  gameState: PokerGameState | BlackjackGameState,
  playerId: string,
  action: string,
  amount?: number
): boolean => {
  // Basic validation logic
  if (gameState.type === 'poker') {
    const pokerState = gameState as PokerGameState;
    const player = pokerState.players.find(p => p.user_id === playerId);
    
    if (!player || player.has_folded || player.has_acted) {
      return false;
    }

    if (action === 'raise' && amount) {
      return amount > pokerState.current_bet && amount <= player.chip_count + player.current_bet;
    }

    return ['fold', 'call', 'raise'].includes(action);
  } else {
    const blackjackState = gameState as BlackjackGameState;
    const player = blackjackState.players.find(p => p.user_id === playerId);
    
    if (!player || player.has_acted) {
      return false;
    }

    return ['hit', 'stand', 'double', 'split'].includes(action);
  }
};
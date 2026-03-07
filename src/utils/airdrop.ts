export interface AirdropUser {
  userId: number;
  username?: string;
  firstName?: string;
  reward: number;
  timestamp: string;
  status: 'pending' | 'sent' | 'failed';
}

export interface AirdropConfig {
  totalUsers: number;
  minReward: number;
  maxReward: number;
  totalBudget: number;
  currency: 'coins' | 'gems' | 'fec';
}

export const generateRandomAirdrops = (
  users: { id: number; username?: string; firstName?: string }[],
  config: AirdropConfig
): AirdropUser[] => {
  const airdrops: AirdropUser[] = [];
  let remainingBudget = config.totalBudget;

  users.forEach((user, index) => {
    let reward: number;
    
    if (index === users.length - 1) {
      reward = remainingBudget;
    } else {
      const maxPossibleReward = Math.min(config.maxReward, remainingBudget - (config.minReward * (users.length - index - 1)));
      reward = Math.floor(Math.random() * (maxPossibleReward - config.minReward + 1)) + config.minReward;
    }
    
    airdrops.push({
      userId: user.id,
      username: user.username,
      firstName: user.firstName,
      reward,
      timestamp: new Date().toISOString(),
      status: 'pending'
    });
    
    remainingBudget -= reward;
  });

  return airdrops;
};

export const calculateAirdropStats = (airdrops: AirdropUser[]) => {
  const total = airdrops.reduce((sum, a) => sum + a.reward, 0);
  const avg = total / airdrops.length;
  const sent = airdrops.filter(a => a.status === 'sent').length;
  const failed = airdrops.filter(a => a.status === 'failed').length;
  const pending = airdrops.filter(a => a.status === 'pending').length;

  return {
    totalRecipients: airdrops.length,
    totalAmount: total,
    averageAmount: avg,
    sentCount: sent,
    failedCount: failed,
    pendingCount: pending
  };
};

export const distributeAirdrops = async (
  airdrops: AirdropUser[],
  batchSize: number = 100
): Promise<{ success: number; failed: number; errors: string[] }> => {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < airdrops.length; i += batchSize) {
    const batch = airdrops.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (airdrop) => {
        try {
          await sendAirdropToUser(airdrop);
          airdrop.status = 'sent';
          success++;
        } catch (error) {
          airdrop.status = 'failed';
          failed++;
          errors.push(`User ${airdrop.userId}: ${error}`);
        }
      })
    );

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return { success, failed, errors };
};

const sendAirdropToUser = async (airdrop: AirdropUser): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Sending ${airdrop.reward} to user ${airdrop.userId}`);
      resolve();
    }, 100);
  });
};

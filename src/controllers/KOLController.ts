import { FastifyRequest, FastifyReply } from 'fastify';
import { AppDataSource } from '../data-source';
import { Account } from '../models/Account';
import { SocialStat } from '../models/SocialStat';

interface GetKOLsQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  filter?: string;
}

export class KOLController {
  // Get KOLs with pagination
  static async getKOLs(request: FastifyRequest<{ Querystring: GetKOLsQuery }>, reply: FastifyReply) {
    try {
      const page = parseInt(request.query.page as string) || 1;
      const limit = parseInt(request.query.limit as string) || 3;
      const sortBy = request.query.sortBy || 'reputation';
      const filter = request.query.filter || 'all';
      const offset = (page - 1) * limit;

      const accountRepository = AppDataSource.getRepository(Account);
      
      // Build query with optional filtering and sorting
      let queryBuilder = accountRepository.createQueryBuilder('account')
        .leftJoinAndSelect('account.socialStat', 'socialStat');
      
      // Apply filtering by expertise category
      if (filter !== 'all') {
        queryBuilder = queryBuilder.where('account.expertise ILIKE :filter', { 
          filter: `%"${filter}"%` 
        });
      }
      
      // Apply sorting
      switch (sortBy) {
        case 'price':
          queryBuilder = queryBuilder.orderBy('account.pricePerSlot', 'ASC');
          break;
        case 'rating':
          queryBuilder = queryBuilder.orderBy('account.rating', 'DESC');
          break;
        case 'reputation':
        default:
          queryBuilder = queryBuilder.orderBy('account.reputation', 'DESC');
          break;
      }
      
      // Apply pagination
      queryBuilder = queryBuilder.skip(offset).take(limit);
      
      const [accounts, total] = await queryBuilder.getManyAndCount();

      const kolData = accounts.map(account => ({
        id: account.id.toString(),
        kol: {
          name: account.displayName,
          username: account.userNameOnX,
          avatar: account.avatarUrl,
          reputation: account.reputation,
          level: account.level as 'Bronze' | 'Silver' | 'Gold' | 'Diamond',
          followers: account.socialStat?.follower || 0,
          completedSessions: account.completedSessions,
          rating: parseFloat(account.rating.toString()),
          expertise: account.expertise ? JSON.parse(account.expertise) : []
        },
        pricePerSlot: parseFloat(account.pricePerSlot.toString()),
        availableSlots: account.availableSlots,
        description: account.description || '',
        tags: account.tags ? JSON.parse(account.tags) : [],
        bookedSlots: account.bookedSlots
      }));

      reply.send({
        success: true,
        data: kolData,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        },
        filters: {
          sortBy,
          filter
        }
      });
    } catch (error) {
      const errorMessage = (error as Error)?.message || 'Unknown error';
      console.error('Error fetching KOLs:', errorMessage);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: errorMessage
      });
    }
  }

  // Seed KOL data (for development)
  static async seedKOLData(request: FastifyRequest, reply: FastifyReply) {
    try {
      const accountRepository = AppDataSource.getRepository(Account);
      const socialStatRepository = AppDataSource.getRepository(SocialStat);

      const kolData = [
        {
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
          userNameOnX: '@alexchen',
          displayName: 'Alex Chen',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4&clothesColor=262e33&skinColor=ae5d29',
          reputation: 2850,
          level: 'Diamond',
          completedSessions: 89,
          rating: 4.9,
          expertise: JSON.stringify(['DeFi', 'Trading', 'NFTs']),
          pricePerSlot: 150,
          availableSlots: 3,
          description: 'Get personalized DeFi strategies and portfolio review. I\'ll analyze your positions and suggest optimizations.',
          tags: JSON.stringify(['Strategy', 'Portfolio', 'Risk Management']),
          bookedSlots: 12,
          followers: 125000
        },
        {
          walletAddress: '0x2345678901bcdef12345678901bcdef123456789',
          userNameOnX: '@sarahk',
          displayName: 'Sarah Kumar',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=ffd93d&clothesColor=3c4858&skinColor=d08b5b',
          reputation: 1950,
          level: 'Gold',
          completedSessions: 67,
          rating: 4.8,
          expertise: JSON.stringify(['NFTs', 'Art', 'Community']),
          pricePerSlot: 120,
          availableSlots: 5,
          description: 'Learn NFT creation, marketing strategies, and how to build a sustainable art business in Web3.',
          tags: JSON.stringify(['NFT Creation', 'Marketing', 'Art Business']),
          bookedSlots: 8,
          followers: 87000
        },
        {
          walletAddress: '0x3456789012cdef123456789012cdef1234567890',
          userNameOnX: '@mikerodriguez',
          displayName: 'Michael Rodriguez',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael&backgroundColor=a7f3d0&clothesColor=25262b&skinColor=fdbcb4',
          reputation: 1420,
          level: 'Silver',
          completedSessions: 34,
          rating: 4.7,
          expertise: JSON.stringify(['Gaming', 'P2E', 'Metaverse']),
          pricePerSlot: 100,
          availableSlots: 7,
          description: 'Dive deep into Play-to-Earn mechanics, guild strategies, and upcoming gaming opportunities.',
          tags: JSON.stringify(['P2E Gaming', 'Guild Building', 'Metaverse']),
          bookedSlots: 5,
          followers: 45000
        },
        {
          walletAddress: '0x456789013def123456789013def12345678901a',
          userNameOnX: '@lunacrypto',
          displayName: 'Luna Chen',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=ddd6fe&clothesColor=0f172a&skinColor=f3d2c1',
          reputation: 3200,
          level: 'Diamond',
          completedSessions: 127,
          rating: 4.95,
          expertise: JSON.stringify(['Web3', 'Blockchain', 'Smart Contracts']),
          pricePerSlot: 200,
          availableSlots: 2,
          description: 'Expert in smart contract development and Web3 architecture. Get insights on building scalable dApps.',
          tags: JSON.stringify(['Smart Contracts', 'dApp Development', 'Security']),
          bookedSlots: 18,
          followers: 180000
        },
        {
          walletAddress: '0x56789014ef123456789014ef12345678901ab2',
          userNameOnX: '@rajdefi',
          displayName: 'Raj Patel',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Raj&backgroundColor=fed7d7&clothesColor=1e3a8a&skinColor=eab308',
          reputation: 2100,
          level: 'Gold',
          completedSessions: 73,
          rating: 4.85,
          expertise: JSON.stringify(['DeFi', 'Yield Farming', 'Tokenomics']),
          pricePerSlot: 130,
          availableSlots: 4,
          description: 'Specialized in DeFi protocols and yield optimization strategies. Learn about advanced farming techniques.',
          tags: JSON.stringify(['Yield Farming', 'LP Strategies', 'Risk Assessment']),
          bookedSlots: 11,
          followers: 95000
        }
      ];

      // Clear existing data
      await socialStatRepository.createQueryBuilder()
        .delete()
        .where("1 = 1")
        .execute();
      
      await accountRepository.createQueryBuilder()
        .delete()
        .where("1 = 1")
        .execute();

      // Create accounts and social stats
      for (const kol of kolData) {
        const { followers, ...accountData } = kol;
        
        // Create account
        const account = accountRepository.create(accountData);
        const savedAccount = await accountRepository.save(account);

        // Create social stat
        const socialStat = socialStatRepository.create({
          accountId: savedAccount.id,
          follower: followers,
          totalPost: Math.floor(Math.random() * 1000) + 100,
          totalLike: Math.floor(Math.random() * 10000) + 1000
        });
        await socialStatRepository.save(socialStat);
      }

      reply.send({
        success: true,
        message: 'KOL data seeded successfully',
        count: kolData.length
      });
    } catch (error) {
      const errorMessage = (error as Error)?.message || 'Unknown error';
      console.error('Error seeding KOL data:', errorMessage);
      reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: errorMessage
      });
    }
  }
}
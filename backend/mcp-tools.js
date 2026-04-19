const axios = require('axios');

const STAYAPI_BASE_URL = process.env.STAYAPI_BASE_URL;
let authToken = null;

// Auto-login with a default guest user
async function getToken() {
  if (authToken) return authToken;
  try {
    // Try to register first (ignore error if exists)
    await axios.post(`${STAYAPI_BASE_URL}/api/v1/auth/register`, {
      username: process.env.STAYAPI_USERNAME,
      password: process.env.STAYAPI_PASSWORD,
      role: 'GUEST'
    }).catch(() => {});

    const res = await axios.post(`${STAYAPI_BASE_URL}/api/v1/auth/login`, {
      username: process.env.STAYAPI_USERNAME,
      password: process.env.STAYAPI_PASSWORD
    });
    authToken = res.data.data.token;
    return authToken;
  } catch (err) {
    console.error('Auth error:', err.message);
    return null;
  }
}

// Tool definitions for Gemini
const toolDefinitions = [
  {
    name: 'query_listings',
    description: 'Search for available listings/stays. Use this when user wants to find, search or browse available accommodations, houses, apartments or stays.',
    parameters: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', description: 'Check-in date in YYYY-MM-DD format' },
        dateTo: { type: 'string', description: 'Check-out date in YYYY-MM-DD format' },
        noOfPeople: { type: 'number', description: 'Number of people/guests' },
        country: { type: 'string', description: 'Country name' },
        city: { type: 'string', description: 'City name' }
      },
      required: ['dateFrom', 'dateTo', 'noOfPeople', 'country', 'city']
    }
  },
  {
    name: 'book_listing',
    description: 'Book a stay/listing. Use this when user wants to make a reservation or book a specific listing.',
    parameters: {
      type: 'object',
      properties: {
        listingId: { type: 'number', description: 'The ID of the listing to book' },
        dateFrom: { type: 'string', description: 'Check-in date in YYYY-MM-DD format' },
        dateTo: { type: 'string', description: 'Check-out date in YYYY-MM-DD format' },
        guestNames: { type: 'array', items: { type: 'string' }, description: 'List of guest names' }
      },
      required: ['listingId', 'dateFrom', 'dateTo', 'guestNames']
    }
  },
  {
    name: 'review_listing',
    description: 'Write a review for a completed stay. Use this when user wants to rate or review a booking.',
    parameters: {
      type: 'object',
      properties: {
        stayId: { type: 'integer', description: 'The booking ID to review, must be a number' },
        rating: { type: 'integer', description: 'Rating from 1 to 5, must be a number like 1, 2, 3, 4 or 5' },
        comment: { type: 'string', description: 'Review comment text' }
      },
      required: ['stayId', 'rating']
    }
  },
  {
    name: 'get_my_bookings',
    description: 'Get the list of bookings for the current user. Use this when user wants to see their reservations.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Tool implementations
async function executeTool(toolName, params) {
  const token = await getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    switch (toolName) {
      case 'query_listings': {
        const res = await axios.get(`${STAYAPI_BASE_URL}/api/v1/listings`, {
          params: {
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            noOfPeople: params.noOfPeople,
            country: params.country,
            city: params.city,
            page: 0
          },
          headers
        });
        const listings = res.data.data?.content || [];
        if (listings.length === 0) {
          return { success: true, message: 'No available listings found for your criteria.', data: [] };
        }
        return { success: true, message: `Found ${listings.length} listing(s)`, data: listings };
      }

      case 'book_listing': {
        const res = await axios.post(`${STAYAPI_BASE_URL}/api/v1/bookings`, {
          listingId: params.listingId,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          guestNames: params.guestNames
        }, { headers });
        return { success: true, message: 'Booking successful!', data: res.data.data };
      }

      case 'review_listing': {
        const res = await axios.post(`${STAYAPI_BASE_URL}/api/v1/reviews`, {
          stayId: parseInt(params.stayId),
          rating: parseInt(params.rating),
          comment: params.comment || ''
        }, { headers });
        return { success: true, message: 'Review submitted successfully!', data: res.data };
      }

      case 'get_my_bookings': {
        const res = await axios.get(`${STAYAPI_BASE_URL}/api/v1/bookings/my`, {
          params: { page: 0 },
          headers
        });
        const bookings = res.data.data?.content || [];
        return { success: true, message: `You have ${bookings.length} booking(s)`, data: bookings };
      }

      default:
        return { success: false, message: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    return { success: false, message: `Error: ${errorMsg}` };
  }
}

module.exports = { toolDefinitions, executeTool };

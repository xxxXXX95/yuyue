const fetch = require('node-fetch');
jest.mock('node-fetch');

const { isSkuInCart, helper } = require('../jobs');

describe('isSkuInCart', function () {
  beforeEach(() => {});
  test('isSkuInCart should works find', async function () {
    fetch.mockImplementation(() =>
      Promise.resolve({
        headers: {
          raw: () => {
            return {};
          },
        },
        json() {
          return {
            success: true,
            resultData: {
              cartInfo: {
                vendors: [
                  {
                    sorted: [
                      {
                        item: {
                          Id: 1,
                        },
                      },
                      {
                        item: {
                          Id: 2,
                        },
                      },
                      {
                        items: [
                          {
                            item: {
                              Id: 3,
                            },
                          },
                        ],
                      },
                    ],
                  },
                  {
                    sorted: [
                      {
                        item: {
                          Id: 5,
                        },
                      },
                    ],
                  },
                ],
              },
            },
          };
        },
      })
    );
    const res1 = await isSkuInCart('1');
    const res2 = await isSkuInCart('2');
    const res3 = await isSkuInCart('3');
    const res4 = await isSkuInCart('4');
    const res5 = await isSkuInCart('5');
    expect([res1, res2, res3, res4, res5]).toEqual([[], [], [], ['4'], []]);
  });

  test('if cart is empty should return all skuIds', async () => {
    fetch.mockImplementation(() => {
      return Promise.resolve({
        headers: {
          raw: () => {
            return {};
          },
        },
        json() {
          return {
            success: true,
            resultData: {
              cartInfo: null,
            },
          };
        },
      });
    });
    const res1 = await isSkuInCart('1');
    const res2 = await isSkuInCart(['1', '2', '3']);
    expect([res1, res2, ]).toEqual([['1'], ['1', '2', '3']]);
  });
});

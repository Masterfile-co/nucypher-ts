import axios, { AxiosResponse } from 'axios';
import qs from 'qs';
import { CapsuleFrag, PublicKey } from 'umbral-pre';

import { RetrievalKit } from '../kits/retrieval';
import { TreasureMap } from '../policies/collections';
import { Base64EncodedBytes, ChecksumAddress, HexEncodedBytes } from '../types';
import { fromBase64, toBase64, toHexString } from '../utils';

export interface Ursula {
  checksumAddress: ChecksumAddress;
  uri: string;
  encryptingKey: HexEncodedBytes;
}

interface GetUrsulasRequest {
  quantity: number;
  duration_periods: number;
  exclude_ursulas?: ChecksumAddress[];
  include_ursulas?: ChecksumAddress[];
}

interface UrsulaResponse {
  checksum_address: ChecksumAddress;
  uri: string;
  encrypting_key: HexEncodedBytes;
}

export interface GetUrsulasResponse {
  result: {
    ursulas: UrsulaResponse[];
  };
  version: string;
}

interface PostRetrieveCFragsRequest {
  treasure_map: Base64EncodedBytes;
  retrieval_kits: Base64EncodedBytes[];
  alice_verifying_key: HexEncodedBytes;
  bob_encrypting_key: HexEncodedBytes;
  bob_verifying_key: HexEncodedBytes;
}

interface PostRetrieveCFragsResult {
  result: {
    retrieval_results: {
      cfrags: {
        [address: string]: string;
      };
    }[];
  };
  version: string;
}

export type RetrieveCFragsResponse = Record<ChecksumAddress, CapsuleFrag>;

export class Porter {
  private readonly porterUri: string;

  constructor(porterUri: string) {
    this.porterUri = porterUri;
  }

  public async getUrsulas(
    quantity: number,
    durationPeriods: number,
    excludeUrsulas?: ChecksumAddress[],
    includeUrsulas?: ChecksumAddress[]
  ): Promise<Ursula[]> {
    const params: GetUrsulasRequest = {
      quantity,
      duration_periods: durationPeriods,
      exclude_ursulas: excludeUrsulas,
      include_ursulas: includeUrsulas,
    };
    const resp: AxiosResponse<GetUrsulasResponse> = await axios.get(
      `${this.porterUri}/get_ursulas`,
      {
        params,
        paramsSerializer: (params) => {
          return qs.stringify(params, { arrayFormat: 'comma' });
        },
      }
    );
    return resp.data.result.ursulas.map((u: UrsulaResponse) => ({
      checksumAddress: u.checksum_address,
      uri: u.uri,
      encryptingKey: u.encrypting_key,
    }));
  }

  public async retrieveCFrags(
    treasureMap: TreasureMap,
    retrievalKits: RetrievalKit[],
    aliceVerifyingKey: PublicKey,
    bobEncryptingKey: PublicKey,
    bobVerifyingKey: PublicKey
  ): Promise<RetrieveCFragsResponse[]> {
    const data: PostRetrieveCFragsRequest = {
      treasure_map: toBase64(treasureMap.toBytes()),
      retrieval_kits: retrievalKits.map((rk) => toBase64(rk.toBytes())),
      alice_verifying_key: toHexString(aliceVerifyingKey.toBytes()),
      bob_encrypting_key: toHexString(bobEncryptingKey.toBytes()),
      bob_verifying_key: toHexString(bobVerifyingKey.toBytes()),
    };
    const resp: AxiosResponse<PostRetrieveCFragsResult> = await axios.post(
      `${this.porterUri}/retrieve_cfrags`,
      data
    );
    return resp.data.result.retrieval_results
      .map((result) => result.cfrags)
      .map((cFrags) => {
        const parsed = Object.keys(cFrags).map((address) => [
          address,
          CapsuleFrag.fromBytes(fromBase64(cFrags[address])),
        ]);
        return Object.fromEntries(parsed);
      });
  }
}

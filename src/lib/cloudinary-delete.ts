import 'server-only'

import { cloudinary } from '@/lib/cloudinary'
import { cloudinaryPublicId } from '@/lib/privacy/format'

const CLOUDINARY_DELETE_BATCH = 100

/**
 * 우리 Cloudinary(`dshs/`·`dshs/posters/`)에 올린 이미지를 지운다 — 탈퇴·프로젝트 삭제·포스터 다시 걸기 공용.
 * 다른 계정·폴더 주소는 건너뛴다. 최선 노력이라 실패해도 조용히 넘어간다(부르는 쪽 일은 이미 끝난 뒤).
 */
export async function deleteCloudinaryImages(urls: string[]): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const ids = [...new Set(urls.map((u) => cloudinaryPublicId(u, cloudName)).filter((id): id is string => id !== null))]
  for (let i = 0; i < ids.length; i += CLOUDINARY_DELETE_BATCH) {
    try {
      await cloudinary.api.delete_resources(ids.slice(i, i + CLOUDINARY_DELETE_BATCH), { resource_type: 'image' })
    } catch {
      // 이미지 정리는 최선 노력
    }
  }
}

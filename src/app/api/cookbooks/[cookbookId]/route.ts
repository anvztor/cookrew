import { NextResponse } from 'next/server'
import {
  getApiRouteError,
  getCookbookDetailData,
  getProxySettingsFromRequest,
} from '@/lib/server/cookrew-data'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cookbookId: string }> }
) {
  try {
    const { cookbookId } = await params
    const data = await getCookbookDetailData(
      cookbookId,
      getProxySettingsFromRequest(request)
    )

    if (!data) {
      return NextResponse.json(
        { error: 'Cookbook not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to load cookbook')
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.status }
    )
  }
}

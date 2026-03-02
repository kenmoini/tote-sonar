'use client';

import { Camera } from 'lucide-react';
import { TotePhoto } from '@/types';
import { PhotoGallery, PhotoUpload } from '@/components/photos';

interface TotePhotosProps {
  photos: TotePhoto[];
  toteId: string;
  toteName: string;
  onPhotosChanged: () => void;
  maxUploadSize: number;
}

export default function TotePhotos({ photos, toteId, toteName, onPhotosChanged, maxUploadSize }: TotePhotosProps) {
  return (
    <div className="tote-detail-section">
      <div className="section-header">
        <h2>Photos</h2>
      </div>
      {photos.length !== 0 && (
        <PhotoGallery
          photos={photos}
          entityName={toteName}
          source="tote"
          onPhotoDeleted={onPhotosChanged}
        />
      )}
      <PhotoUpload
        entityType="tote"
        entityId={toteId}
        currentPhotoCount={photos.length}
        maxPhotos={3}
        onUploadComplete={onPhotosChanged}
        maxUploadSize={maxUploadSize}
      />
    </div>
  );
}

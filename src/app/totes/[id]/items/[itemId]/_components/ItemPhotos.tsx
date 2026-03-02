'use client';

import { Camera } from 'lucide-react';
import { ItemPhoto } from '@/types';
import { PhotoGallery, PhotoUpload } from '@/components/photos';

interface ItemPhotosProps {
  photos: ItemPhoto[];
  itemId: string;
  itemName: string;
  onPhotosChanged: () => void;
  maxUploadSize: number;
}

export default function ItemPhotos({ photos, itemId, itemName, onPhotosChanged, maxUploadSize }: ItemPhotosProps) {
  return (
    <div className="tote-detail-section">
      <div className="section-header">
        <h2>
          <Camera style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} size={20} />
          Photos ({photos.length}/3)
        </h2>
      </div>

      {photos.length !== 0 && (
        <PhotoGallery
          photos={photos}
          entityName={itemName}
          source="item"
          onPhotoDeleted={onPhotosChanged}
        />
      )}

      <PhotoUpload
        entityType="item"
        entityId={itemId}
        currentPhotoCount={photos.length}
        maxPhotos={3}
        onUploadComplete={onPhotosChanged}
        maxUploadSize={maxUploadSize}
      />
    </div>
  );
}
